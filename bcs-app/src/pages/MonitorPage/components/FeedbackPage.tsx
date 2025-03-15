import React, { useState } from "react";

const FeedbackPage: React.FC = () => {
  const [feedback, setFeedback] = useState("");

  return (
    <div>
      <h3>Feedback</h3>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="w-full p-2 border rounded bg-gray-700 text-white"
      />
      <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
        Submit Feedback
      </button>
    </div>
  );
};

export default FeedbackPage;