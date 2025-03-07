import { useState, useEffect } from "react";
import {
  FiPlus,
  FiSearch,
  FiCopy,
  FiMail,
  FiTrash2,
  FiExternalLink,
} from "react-icons/fi";
import { hrApi } from "../../services/api";

const InterviewLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLink, setNewLink] = useState({
    candidateEmail: "",
    candidateName: "",
    position: "",
    topic: "",
    expiresIn: "7",
  });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const linkData = await hrApi.getInterviewLinks();
      setLinks(linkData);
      setLoading(false);
    } catch (err) {
      setError("Failed to load interview links: " + err.message);
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    try {
      // Validate form
      if (
        !newLink.candidateName ||
        !newLink.candidateEmail ||
        !newLink.position ||
        !newLink.topic
      ) {
        setError("Please fill in all required fields");
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newLink.candidateEmail)) {
        setError("Please enter a valid email address");
        return;
      }

      const result = await hrApi.createInterviewLink({
        candidateName: newLink.candidateName,
        candidateEmail: newLink.candidateEmail,
        position: newLink.position,
        topic: newLink.topic,
        expiresIn: parseInt(newLink.expiresIn),
      });

      // Add the new link to the list
      setLinks([result, ...links]);

      // Reset form and close modal
      setNewLink({
        candidateEmail: "",
        candidateName: "",
        position: "",
        topic: "",
        expiresIn: "7",
      });
      setShowCreateModal(false);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteLink = async (id) => {
    if (!id) {
      setError("Invalid link ID");
      return;
    }

    if (confirm("Are you sure you want to delete this interview link?")) {
      try {
        await hrApi.deleteInterviewLink(id);

        // Update the list
        setLinks(links.filter((link) => link._id !== id));
        setError("");
      } catch (err) {
        setError("Failed to delete interview link: " + err.message);
      }
    }
  };

  const handleResendEmail = async (id) => {
    if (!id) {
      setError("Invalid link ID");
      return;
    }

    try {
      const result = await hrApi.resendInterviewEmail(id);

      // Update the sent count
      setLinks(
        links.map((link) =>
          link._id === id ? { ...link, sent_count: result.sent_count } : link
        )
      );

      alert("Email sent successfully!");
      setError("");
    } catch (err) {
      setError("Failed to resend email: " + err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Link copied to clipboard!");
  };

  const filteredLinks = links.filter((link) => {
    if (!link) return false;
    const searchTermLower = searchTerm.toLowerCase();
    return (
      (link.candidate_name || "").toLowerCase().includes(searchTermLower) ||
      (link.candidate_email || "").toLowerCase().includes(searchTermLower) ||
      (link.position || "").toLowerCase().includes(searchTermLower)
    );
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Interview Links</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <FiPlus className="mr-2" /> Create Interview Link
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      <div className="card mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">All Interview Links</h2>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search links..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLinks.map((link) => (
                <tr key={link._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {link.candidate_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {link.candidate_email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {link.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {link.topic}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                        link.completed
                          ? "completed"
                          : link.is_expired
                          ? "expired"
                          : "pending"
                      )}`}
                    >
                      {link.completed
                        ? "Completed"
                        : link.is_expired
                        ? "Expired"
                        : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(link.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(link.expires_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => copyToClipboard(link.url)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Copy Link"
                      >
                        <FiCopy />
                      </button>
                      <button
                        onClick={() => handleResendEmail(link._id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Resend Email"
                      >
                        <FiMail />
                      </button>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-900"
                        title="Open Link"
                      >
                        <FiExternalLink />
                      </a>
                      <button
                        onClick={() => handleDeleteLink(link._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Link"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredLinks.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No interview links found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Create Interview Link</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate Name *
                </label>
                <input
                  type="text"
                  value={newLink.candidateName}
                  onChange={(e) =>
                    setNewLink({ ...newLink, candidateName: e.target.value })
                  }
                  className="input-field"
                  placeholder="Enter candidate's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate Email *
                </label>
                <input
                  type="email"
                  value={newLink.candidateEmail}
                  onChange={(e) =>
                    setNewLink({ ...newLink, candidateEmail: e.target.value })
                  }
                  className="input-field"
                  placeholder="Enter candidate's email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position *
                </label>
                <input
                  type="text"
                  value={newLink.position}
                  onChange={(e) =>
                    setNewLink({ ...newLink, position: e.target.value })
                  }
                  className="input-field"
                  placeholder="Enter position title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interview Topic *
                </label>
                <input
                  type="text"
                  value={newLink.topic}
                  onChange={(e) =>
                    setNewLink({ ...newLink, topic: e.target.value })
                  }
                  className="input-field"
                  placeholder="e.g., React Development, System Design"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires In
                </label>
                <select
                  value={newLink.expiresIn}
                  onChange={(e) =>
                    setNewLink({ ...newLink, expiresIn: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={handleCreateLink} className="btn-primary">
                Create & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewLinks;
