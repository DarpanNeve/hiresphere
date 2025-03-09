import { useState, useEffect } from "react";
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiMail,
  FiLink,
} from "react-icons/fi";
import { hrApi } from "../../services/api";

const CandidateManagement = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    email: "",
    position: "",
    status: "pending",
  });

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const candidateData = await hrApi.getCandidates();
      setCandidates(candidateData);
      setLoading(false);
    } catch (err) {
      setError("Failed to load candidates: " + err.message);
      setLoading(false);
    }
  };

  const handleAddCandidate = async () => {
    try {
      // Validate form
      if (!newCandidate.name || !newCandidate.email || !newCandidate.position) {
        setError("Please fill in all required fields");
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newCandidate.email)) {
        setError("Please enter a valid email address");
        return;
      }

      const result = await hrApi.addCandidate(newCandidate);

      // Add the new candidate to the list
      setCandidates([result, ...candidates]);

      // Reset form and close modal
      setNewCandidate({
        name: "",
        email: "",
        position: "",
        status: "pending",
      });
      setShowAddModal(false);
      setError("");
    } catch (err) {
      setError("Failed to add candidate: " + err.message);
    }
  };

  const handleEditCandidate = async () => {
    try {
      if (!selectedCandidate) {
        setError("No candidate selected for editing");
        return;
      }

      // Validate email if it was changed
      if (selectedCandidate.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(selectedCandidate.email)) {
          setError("Please enter a valid email address");
          return;
        }
      }

      const result = await hrApi.updateCandidate(
        selectedCandidate._id,
        selectedCandidate
      );

      // Update the candidate in the list
      setCandidates(candidates.map((c) => (c._id === result._id ? result : c)));

      setShowEditModal(false);
      setSelectedCandidate(null);
      setError("");
    } catch (err) {
      setError("Failed to update candidate: " + err.message);
    }
  };

  const handleDeleteCandidate = async (id) => {
    if (confirm("Are you sure you want to delete this candidate?")) {
      try {
        await hrApi.deleteCandidate(id);

        // Update the list
        setCandidates(candidates.filter((candidate) => candidate._id !== id));
        setError("");
      } catch (err) {
        setError("Failed to delete candidate: " + err.message);
      }
    }
  };

  const handleCreateInterviewLink = async (candidate) => {
    try {
      const linkData = {
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        position: candidate.position,
        topic: `${candidate.position} Interview`,
        expiresIn: 7,
      };

      const link = await hrApi.createInterviewLink(linkData);

      alert(`Interview link created for ${candidate.name}. Link: ${link.url}`);
      setError("");
    } catch (err) {
      setError("Failed to create interview link: " + err.message);
    }
  };

  const filteredCandidates = candidates.filter(
    (candidate) =>
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "interviewed":
        return "bg-blue-100 text-blue-800";
      case "hired":
        return "bg-green-100 text-green-800";
      case "rejected":
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
        <h1 className="text-3xl font-bold text-gray-900">
          Candidate Management
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center"
        >
          <FiPlus className="mr-2" /> Add Candidate
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      <div className="card mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">All Candidates</h2>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidates..."
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
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interviews
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCandidates.map((candidate) => (
                <tr key={candidate._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {candidate.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {candidate.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {candidate.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                        candidate.status
                      )}`}
                    >
                      {candidate.status.charAt(0).toUpperCase() +
                        candidate.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {candidate.interview_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {candidate.last_activity
                      ? new Date(candidate.last_activity).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleCreateInterviewLink(candidate)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Create Interview Link"
                      >
                        <FiLink />
                      </button>
                      <button
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Send Email"
                      >
                        <FiMail />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCandidate(candidate);
                          setShowEditModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Candidate"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => handleDeleteCandidate(candidate._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Candidate"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCandidates.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No candidates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Add New Candidate</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newCandidate.name}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, name: e.target.value })
                  }
                  className="input-field"
                  placeholder="Enter candidate's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newCandidate.email}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, email: e.target.value })
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
                  value={newCandidate.position}
                  onChange={(e) =>
                    setNewCandidate({
                      ...newCandidate,
                      position: e.target.value,
                    })
                  }
                  className="input-field"
                  placeholder="Enter position applied for"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newCandidate.status}
                  onChange={(e) =>
                    setNewCandidate({ ...newCandidate, status: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="pending">Pending</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={handleAddCandidate} className="btn-primary">
                Add Candidate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Candidate Modal */}
      {showEditModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Edit Candidate</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={selectedCandidate.name}
                  onChange={(e) =>
                    setSelectedCandidate({
                      ...selectedCandidate,
                      name: e.target.value,
                    })
                  }
                  className="input-field"
                  placeholder="Enter candidate's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={selectedCandidate.email}
                  onChange={(e) =>
                    setSelectedCandidate({
                      ...selectedCandidate,
                      email: e.target.value,
                    })
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
                  value={selectedCandidate.position}
                  onChange={(e) =>
                    setSelectedCandidate({
                      ...selectedCandidate,
                      position: e.target.value,
                    })
                  }
                  className="input-field"
                  placeholder="Enter position applied for"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={selectedCandidate.status}
                  onChange={(e) =>
                    setSelectedCandidate({
                      ...selectedCandidate,
                      status: e.target.value,
                    })
                  }
                  className="input-field"
                >
                  <option value="pending">Pending</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCandidate(null);
                  setError("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={handleEditCandidate} className="btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateManagement;
