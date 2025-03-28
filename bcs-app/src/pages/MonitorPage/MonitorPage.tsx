import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { auth } from "../../Firebase/firebaseconfig";
import { onAuthStateChanged } from "firebase/auth";

interface JobHistory {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  status: 'completed' | 'error';
  timestamp: string;
  output_format: string;
  processing_type: 'transcode' | 'watermark';
}

interface UserInfo {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

type ViewFilter = 'all' | 'my-jobs' | 'others';

const MonitorPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [jobHistory, setJobHistory] = useState<JobHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setUserInfo({
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        });
        await fetchJobs();
      } else {
        setUserInfo(null);
        setJobHistory([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/job-history/jobs/');
      if (!response.ok) {
        throw new Error('Failed to fetch job history');
      }
      const data = await response.json();
      setJobHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job history');
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobHistory.filter(job => {
    if (viewFilter === 'my-jobs') {
      return job.user_id === currentUser?.uid;
    } else if (viewFilter === 'others') {
      return job.user_id !== currentUser?.uid;
    }
    return true;
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="max-w-4xl mx-auto my-8"
    >
      <Card className="p-6 bg-gray-800 text-white shadow-lg rounded-lg">
        {currentUser ? (
          <div className="space-y-8">
            <div className="border-b border-gray-700 pb-6">
              <div className="flex items-center space-x-4 mb-4">
                {userInfo?.photoURL && (
                  <img 
                    src={userInfo.photoURL} 
                    alt="Profile" 
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold">Job History</h2>
                  <div className="text-gray-400">
                    <p className="font-medium">{userInfo?.displayName || 'User'}</p>
                    <p className="text-sm">{userInfo?.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 mt-4">
                <Button
                  variant={viewFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setViewFilter('all')}
                  className="bg-white text-black hover:bg-gray-100"
                >
                  All Jobs
                </Button>
                <Button
                  variant={viewFilter === 'my-jobs' ? 'default' : 'outline'}
                  onClick={() => setViewFilter('my-jobs')}
                  className="bg-white text-black hover:bg-gray-100"
                >
                  My Jobs
                </Button>
                <Button
                  variant={viewFilter === 'others' ? 'default' : 'outline'}
                  onClick={() => setViewFilter('others')}
                  className="bg-white text-black hover:bg-gray-100"
                >
                  Others' Jobs
                </Button>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-400">{error}</p>
              </div>
            ) : filteredJobs.length > 0 ? (
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <Card key={job.id} className="bg-gray-700">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-lg">{job.file_name}</h3>
                            <span className="text-sm text-gray-400">
                              by {job.user_name || 'Unknown User'}
                            </span>
                          </div>
                          <p className="text-gray-400">Size: {formatFileSize(job.file_size)}</p>
                          <p className="text-gray-400">Type: {job.file_type}</p>
                          <p className="text-gray-400 text-sm">Email: {job.user_email || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-sm ${
                            job.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {job.status}
                          </span>
                          <p className="text-gray-400 mt-2">
                            {new Date(job.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}
                          </p>
                          <p className="text-gray-400">
                            {job.processing_type === 'transcode' ? 'Transcoded' : 'Watermarked'} to {job.output_format}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No jobs found for the selected filter.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-lg">Please log in to view job history.</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default MonitorPage;