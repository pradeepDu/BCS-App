import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "../../ui/card";
import { Button } from "../../ui/button";
import { auth, signInWithGoogle } from "../../Firebase/firebaseconfig";
import { onAuthStateChanged } from "firebase/auth";

interface JobHistory {
  _id: string;  // Changed from id to _id to match MongoDB
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

type ViewFilter = 'all' | 'my-jobs' | 'others';

const MonitorPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [jobHistory, setJobHistory] = useState<JobHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchJobs();
      } else {
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
        const errorText = await response.text();
        throw new Error(`Failed to fetch job history: ${errorText}`);
      }
      const data = await response.json();
      setJobHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job history');
      console.error('Error fetching jobs:', err);
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
      className="w-full min-h-screen bg-gray-900 p-4"
    >
      <Card className="w-full bg-gray-800 text-white shadow-lg rounded-lg">
        {currentUser ? (
          <div className="space-y-8 p-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Job History</h1>
              <div className="flex space-x-4">
                <Button
                  variant={viewFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setViewFilter('all')}
                  className={`${
                    viewFilter === 'all' 
                      ? 'bg-black text-white hover:bg-gray-800' 
                      : 'bg-white text-black hover:bg-gray-100 border-black'
                  }`}
                >
                  All Jobs
                </Button>
                <Button
                  variant={viewFilter === 'my-jobs' ? 'default' : 'outline'}
                  onClick={() => setViewFilter('my-jobs')}
                  className={`${
                    viewFilter === 'my-jobs' 
                      ? 'bg-black text-white hover:bg-gray-800' 
                      : 'bg-white text-black hover:bg-gray-100 border-black'
                  }`}
                >
                  My Jobs
                </Button>
                <Button
                  variant={viewFilter === 'others' ? 'default' : 'outline'}
                  onClick={() => setViewFilter('others')}
                  className={`${
                    viewFilter === 'others' 
                      ? 'bg-black text-white hover:bg-gray-800' 
                      : 'bg-white text-black hover:bg-gray-100 border-black'
                  }`}
                >
                  Others' Jobs
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center p-4">
                {error}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center p-4">
                No jobs found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-4">File Name</th>
                      <th className="text-left p-4">User</th>
                      <th className="text-left p-4">Type</th>
                      <th className="text-left p-4">Size</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job) => (
                      <tr key={job._id} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="p-4">{job.file_name}</td>
                        <td className="p-4">{job.user_name || job.user_email || 'Unknown'}</td>
                        <td className="p-4 capitalize">{job.processing_type}</td>
                        <td className="p-4">{formatFileSize(job.file_size)}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full ${
                            job.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="p-4">{new Date(job.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center">
            <h2 className="text-xl mb-4">Please sign in to view job history</h2>
            <Button onClick={signInWithGoogle}>
              Sign In
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default MonitorPage;