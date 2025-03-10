import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import {
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiHome,
  FiBarChart2,
  FiUsers,
  FiLink,
  FiFileText,
  FiCreditCard,
} from "react-icons/fi";

const Navbar = () => {
  const { user, logout, isHR, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/"
              className="text-xl font-bold text-primary flex items-center"
            >
              <FiBarChart2 className="mr-2" />
              AI Interviewer
            </Link>

            {user && (
              <div className="hidden md:flex space-x-8 ml-10">
                {isHR() ? (
                  <>
                    <Link
                      to="/hr/dashboard"
                      className="text-gray-700 hover:text-primary flex items-center"
                    >
                      <FiHome className="mr-1" /> Dashboard
                    </Link>
                    <Link
                      to="/hr/candidates"
                      className="text-gray-700 hover:text-primary flex items-center"
                    >
                      <FiUsers className="mr-1" /> Candidates
                    </Link>
                    <Link
                      to="/hr/interview-links"
                      className="text-gray-700 hover:text-primary flex items-center"
                    >
                      <FiLink className="mr-1" /> Interview Links
                    </Link>
                    <Link
                      to="/hr/reports"
                      className="text-gray-700 hover:text-primary flex items-center"
                    >
                      <FiFileText className="mr-1" /> Reports
                    </Link>
                  </>
                ) : isAdmin() ? (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className="text-gray-700 hover:text-primary flex items-center"
                    >
                      <FiHome className="mr-1" /> Dashboard
                    </Link>
                    <Link
                      to="/admin/my-subscription"
                      className="text-gray-700 hover:text-primary flex items-center"
                    >
                      <FiCreditCard className="mr-1" /> My Subscription
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/dashboard"
                      className="text-gray-700 hover:text-primary flex items-center"
                    >
                      <FiHome className="mr-1" /> Dashboard
                    </Link>
                    <Link
                      to="/interview"
                      className="text-gray-700 hover:text-primary flex items-center"
                    >
                      <FiBarChart2 className="mr-1" /> New Interview
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <button
                    onClick={toggleMenu}
                    className="flex items-center text-gray-700 hover:text-primary"
                  >
                    <FiUser className="mr-1" />
                    <span className="hidden md:inline">{user.email}</span>
                    {isMenuOpen ? (
                      <FiX className="ml-1" />
                    ) : (
                      <FiMenu className="ml-1" />
                    )}
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        Signed in as{" "}
                        <span className="font-semibold">{user.email}</span>
                      </div>

                      {/* Mobile menu items */}
                      <div className="md:hidden">
                        {isHR() ? (
                          <>
                            <Link
                              to="/hr/dashboard"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Dashboard
                            </Link>
                            <Link
                              to="/hr/candidates"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Candidates
                            </Link>
                            <Link
                              to="/hr/interview-links"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Interview Links
                            </Link>
                            <Link
                              to="/hr/reports"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Reports
                            </Link>
                          </>
                        ) : isAdmin() ? (
                          <>
                            <Link
                              to="/admin/dashboard"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Dashboard
                            </Link>
                            <Link
                              to="/admin/my-subscription"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              My Subscription
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              to="/dashboard"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Dashboard
                            </Link>
                            <Link
                              to="/interview"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              New Interview
                            </Link>
                          </>
                        )}
                      </div>

                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiLogOut className="inline mr-1" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary">
                  Login
                </Link>
                <Link to="/register" className="btn-primary">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
