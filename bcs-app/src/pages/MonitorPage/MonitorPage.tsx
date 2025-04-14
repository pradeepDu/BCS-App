import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "../../ui/card";
import { Button } from "../../ui/button";
import { auth, signInWithGoogle } from "../../Firebase/firebaseconfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { Progress } from "../../ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../ui/dialog";

interface JobHistory {
  _id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  status: 'processing' | 'completed' | 'error';
  timestamp: string;
  output_format: string;
  processing_type: 'transcode' | 'watermark';
  progress?: number;
  current_stage?: string;
  outputUrl?: string;
}

interface JobLog {
  _id: string;
  job_id: string;
  timestamp: string;
  action: string;
  details: string;
  status: string;
  stage?: string;
  progress?: number;
}

interface CurrentJob {
  jobId: string;
  processingType: 'transcode' | 'watermark';
  fileName: string;
  fileSize: number;
  fileType: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  currentStage: string;
  outputUrl?: string;
}

type ViewFilter = 'all' | 'my-jobs' | 'others';

const CHECKPOINTS = {
  transcode: [
    { stage: 0, label: "Initializing", progress: 0 },
    { stage: 1, label: "Uploading", progress: 20 },
    { stage: 2, label: "Processing", progress: 50 },
    { stage: 3, label: "Finalizing", progress: 80 },
    { stage: 4, label: "Completed", progress: 100 }
  ],
  watermark: [
    { stage: 0, label: "Initializing", progress: 0 },
    { stage: 1, label: "Uploading Video", progress: 15 },
    { stage: 2, label: "Uploading Watermark", progress: 30 },
    { stage: 3, label: "Processing", progress: 60 },
    { stage: 4, label: "Applying Watermark", progress: 80 },
    { stage: 5, label: "Completed", progress: 100 }
  ]
};

const MonitorPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jobHistory, setJobHistory] = useState<JobHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [currentJob, setCurrentJob] = useState<CurrentJob | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [jobLogs, setJobLogs] = useState<JobLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [allLogs, setAllLogs] = useState<JobLog[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Handle Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load current job from localStorage on mount
  useEffect(() => {
    const storedJob = localStorage.getItem('currentJob');
    if (storedJob) {
      const job = JSON.parse(storedJob);
      setCurrentJob(job);
    }
  }, []);

  // Listen for progress updates
  useEffect(() => {
    const handleProgressUpdate = (event: CustomEvent) => {
      const { jobId, progress, message, processingType, fileName, fileSize, fileType, userId, userName, userEmail, outputUrl } = event.detail;
      
      const updatedJob: CurrentJob = {
        jobId,
        processingType,
        fileName,
        fileSize,
        fileType,
        userId,
        userName,
        userEmail,
        status: progress === 100 ? 'completed' : 'processing' as 'processing' | 'completed' | 'error',
        progress,
        currentStage: message,
        outputUrl
      };
      
      setCurrentJob(updatedJob);
      localStorage.setItem('currentJob', JSON.stringify(updatedJob));
    };

    window.addEventListener('progressUpdate', handleProgressUpdate as EventListener);
    return () => window.removeEventListener('progressUpdate', handleProgressUpdate as EventListener);
  }, []);

  // Fetch completed jobs from database
  useEffect(() => {
    const fetchCompletedJobs = async () => {
      if (!currentUser && !isAuthLoading) {
        setLoading(false);
        setJobHistory([]);
        return;
      }
      if (!currentUser) return;

      setLoading(true);
      try {
        const response = await fetch('http://localhost:8000/api/job-history/jobs/');
        if (!response.ok) {
          throw new Error('Failed to fetch job history');
        }
        const data = await response.json();
        setJobHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job history');
        console.error('Error fetching jobs:', err);
        setJobHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedJobs();
  }, [currentUser, isAuthLoading]);

  // Fetch job logs when a job is selected
  useEffect(() => {
    const fetchJobLogs = async () => {
      if (!selectedJob) return;
      
      setLogsLoading(true);
      try {
        // Only keep console logs for development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Fetching logs for job ID: ${selectedJob}`);
        }
        
        const response = await fetch(`http://localhost:8000/api/job-logs/${selectedJob}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch job logs: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Only keep console logs for development
        if (process.env.NODE_ENV === 'development') {
          console.log('Received job logs:', data);
        }
        
        setJobLogs(Array.isArray(data) ? data : []);
        
        // Only keep debugging for development
        if (process.env.NODE_ENV === 'development' && Array.isArray(data) && data.length === 0) {
          console.warn('No logs found for job:', selectedJob);
          
          // Check if the job exists
          const job = jobHistory.find(j => j._id === selectedJob);
          if (job) {
            console.log('Job exists but no logs found:', job);
          } else {
            console.warn('Job not found in history:', selectedJob);
          }
        }
      } catch (err) {
        console.error('Error fetching job logs:', err);
        setJobLogs([]);
      } finally {
        setLogsLoading(false);
      }
    };

    fetchJobLogs();
  }, [selectedJob, jobHistory]);

  const filteredJobs = React.useMemo(() => {
    const completedJobs = jobHistory.filter(job => job.status === 'completed');
    
    if (viewFilter === 'my-jobs') {
      return completedJobs.filter(job => job.user_id === currentUser?.uid);
    } else if (viewFilter === 'others') {
      return completedJobs.filter(job => job.user_id !== currentUser?.uid);
    }
    return completedJobs;
  }, [jobHistory, viewFilter, currentUser]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCurrentJobDownload = () => {
    if (currentJob?.outputUrl) {
      const link = document.createElement('a');
      link.href = currentJob.outputUrl;
      
      const baseName = currentJob.fileName.split('.').slice(0, -1).join('.') || currentJob.fileName;
      const extension = currentJob.processingType === 'transcode' ? 'mp4' : 'mp4';
      link.download = `${baseName}_${currentJob.processingType}_processed.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const handleHistoricalJobDownload = (job: JobHistory) => {
    if (job.outputUrl) {
      const link = document.createElement('a');
      link.href = job.outputUrl;
      
      const baseName = job.file_name.split('.').slice(0, -1).join('.') || job.file_name;
      const extension = job.output_format || (job.processing_type === 'transcode' ? 'mp4' : 'mp4');
      link.download = `${baseName}_${job.processing_type}_processed.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.warn("Output URL missing for historical job:", job._id);
      setError("Download link not available for this job.");
    }
  };

  const handleViewDetails = (jobId: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Opening details for job:', jobId);
      console.log('All jobs:', jobHistory);
      const job = jobHistory.find(j => j._id === jobId);
      console.log('Selected job details:', job);
    }
    
    setSelectedJob(jobId);
    setShowDetailsDialog(true);
  };

  // Clean up fetchAllLogs function
  const fetchAllLogs = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetching all logs for debugging');
      }
      
      setLogsLoading(true);
      
      const response = await fetch('http://localhost:8000/api/job-logs/all?limit=50');
      if (!response.ok) {
        throw new Error(`Failed to fetch all logs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('All logs:', data);
      }
      
      setAllLogs(Array.isArray(data) ? data : []);
      setShowAllLogs(true);
    } catch (err) {
      console.error('Error fetching all logs:', err);
      setAllLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold">Job Monitor</h1>
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

            {currentJob && (
              <div className="bg-gray-700 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Current Job</h2>
                  {currentJob.status === 'completed' && currentJob.outputUrl && (
                    <Button
                      onClick={handleCurrentJobDownload}
                      className="bg-green-500 text-white hover:bg-green-600"
                    >
                      Download
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">File Name</p>
                    <p className="font-medium">{currentJob.fileName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Type</p>
                    <p className="font-medium capitalize">{currentJob.processingType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Size</p>
                    <p className="font-medium">{formatFileSize(currentJob.fileSize)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <p className="font-medium capitalize">{currentJob.status}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{currentJob.currentStage}</span>
                    <span>{currentJob.progress}%</span>
                  </div>
                  <Progress 
                    value={currentJob.progress} 
                    className="h-4 bg-gray-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    {CHECKPOINTS[currentJob.processingType].map((checkpoint, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full ${
                          currentJob.progress >= checkpoint.progress 
                            ? 'bg-green-500' 
                            : 'bg-gray-500'
                        }`} />
                        <span className="mt-1">{checkpoint.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <h2 className="text-xl font-semibold border-t border-gray-600 pt-6">Completed Jobs</h2>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center p-4">
                {error}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center p-4 text-gray-400">
                No completed jobs found matching the filter.
              </div>
            ) : (
              <div className="space-y-6">
                {filteredJobs.map((job) => (
                  <div key={job._id} className="bg-gray-700 rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                       <p className="font-medium text-lg">{job.file_name}</p>
                       <div className="flex space-x-2">
                         <Button
                           onClick={() => handleViewDetails(job._id)}
                           className="bg-blue-500 text-white hover:bg-blue-600 text-sm px-3 py-1"
                           variant="outline"
                         >
                           Details
                         </Button>
                         {job.outputUrl && (
                           <Button
                             onClick={() => handleHistoricalJobDownload(job)}
                             className="bg-green-500 text-white hover:bg-green-600 text-sm px-3 py-1"
                           >
                             Download
                           </Button>
                         )}
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-gray-400">User</p>
                        <p>{job.user_name || job.user_email || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Type</p>
                        <p className="capitalize">{job.processing_type}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Size</p>
                        <p>{formatFileSize(job.file_size)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Completed</p>
                        <p>{new Date(job.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Completed</span>
                        <span>100%</span>
                      </div>
                      <Progress 
                        value={100} 
                        className="h-3 bg-gray-600"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        {CHECKPOINTS[job.processing_type].map((checkpoint, index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="mt-1">{checkpoint.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center">
            <h2 className="text-xl mb-4">Please sign in to view job history</h2>
            <Button 
              onClick={signInWithGoogle}
              className="bg-white text-black hover:bg-gray-100"
            >
              Sign In with Google
            </Button>
          </div>
        )}
      </Card>

      {/* Job Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="bg-gray-800 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
          </DialogHeader>
          
          {logsLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="h-96 overflow-auto rounded-md">
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4 bg-gray-700 p-4 rounded-md">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Job Information</h3>
                    {selectedJob && 
                      (() => {
                        const job = jobHistory.find(j => j._id === selectedJob);
                        return job ? (
                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-400">Job ID:</span> <span className="break-all">{job._id}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">File Name:</span> {job.file_name}
                            </div>
                            <div>
                              <span className="text-gray-400">Size:</span> {formatFileSize(job.file_size)}
                            </div>
                            <div>
                              <span className="text-gray-400">Type:</span> <span className="capitalize">{job.processing_type}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Output Format:</span> {job.output_format}
                            </div>
                            <div>
                              <span className="text-gray-400">Status:</span> <span className="capitalize">{job.status}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Created At:</span> {new Date(job.timestamp).toLocaleString()}
                            </div>
                          </div>
                        ) : null;
                      })()
                    }
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">User Information</h3>
                    {selectedJob && 
                      (() => {
                        const job = jobHistory.find(j => j._id === selectedJob);
                        return job ? (
                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-400">Name:</span> {job.user_name || 'N/A'}
                            </div>
                            <div>
                              <span className="text-gray-400">Email:</span> {job.user_email || 'N/A'}
                            </div>
                            <div>
                              <span className="text-gray-400">User ID:</span> <span className="break-all">{job.user_id}</span>
                            </div>
                          </div>
                        ) : null;
                      })()
                    }
                  </div>
                </div>

                <h3 className="font-semibold text-lg">Processing Logs</h3>
                
                {jobLogs.length === 0 ? (
                  <div className="bg-yellow-900 text-yellow-200 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h4 className="font-medium text-lg">No Logs Found</h4>
                    </div>
                    <p>No detailed logs were found for this job. This may be due to one of the following reasons:</p>
                    <ul className="list-disc ml-6 mt-2 space-y-1">
                      <li>The job was processed before detailed logging was implemented</li>
                      <li>There was an issue recording the logs during processing</li>
                      <li>The logs database was cleared or the logs expired</li>
                    </ul>
                    <div className="mt-3 text-xs opacity-75">
                      <span className="font-semibold">Job ID:</span> <span className="break-all">{selectedJob}</span>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-700 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Stage</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {jobLogs.map((log, index) => (
                          <tr key={log._id || index} className={index % 2 === 0 ? 'bg-gray-750' : ''}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {log.stage || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {log.action}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              <span className={`inline-block px-2 rounded-full ${
                                log.status === 'completed' ? 'bg-green-900 text-green-300' :
                                log.status === 'error' ? 'bg-red-900 text-red-300' :
                                'bg-blue-900 text-blue-300'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {typeof log.progress === 'number' ? `${log.progress}%` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Debug Info (for development) */}
                {process.env.NODE_ENV !== 'production' && (
                  <div className="mt-4 p-3 border border-gray-600 rounded text-xs font-mono">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-gray-400">Debug Information:</div>
                      <Button 
                        onClick={fetchAllLogs}
                        className="text-xs py-0 h-6 bg-blue-800 hover:bg-blue-700"
                        variant="outline"
                      >
                        Fetch All Logs
                      </Button>
                    </div>
                    <div><span className="text-gray-400">Selected Job ID:</span> {selectedJob}</div>
                    <div><span className="text-gray-400">Logs Found:</span> {jobLogs.length}</div>
                    {jobLogs.length > 0 && (
                      <div>
                        <div className="mt-1 text-gray-400">First Log:</div>
                        <pre className="overflow-x-auto mt-1 text-gray-300">
                          {JSON.stringify(jobLogs[0], null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {showAllLogs && (
                      <div>
                        <div className="mt-2 text-gray-400 flex items-center">
                          <span>All Logs ({allLogs.length}):</span>
                          <Button
                            onClick={() => setShowAllLogs(false)}
                            className="text-xs ml-2 py-0 h-5"
                            variant="ghost"
                          >
                            Hide
                          </Button>
                        </div>
                        <div className="mt-1 max-h-40 overflow-y-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr>
                                <th className="pr-2">Job ID</th>
                                <th className="pr-2">Action</th>
                                <th className="pr-2">Stage</th>
                                <th className="pr-2">Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allLogs.map((log, i) => (
                                <tr key={log._id || i} className={log.job_id === selectedJob ? "bg-blue-900" : ""}>
                                  <td className="pr-2 truncate max-w-[100px]">{log.job_id}</td>
                                  <td className="pr-2">{log.action}</td>
                                  <td className="pr-2">{log.stage || '-'}</td>
                                  <td className="pr-2">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              onClick={() => setShowDetailsDialog(false)}
              className="bg-white text-black hover:bg-gray-100"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default MonitorPage;