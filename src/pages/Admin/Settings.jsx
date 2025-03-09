import { useState, useEffect } from "react";
import { adminApi } from "../../services/api";

const Settings = () => {
  const [settings, setSettings] = useState({
    system: {
      maintenance_mode: false,
      debug_mode: false,
      rate_limit: 60,
      max_file_size: 5,
      allowed_file_types: ["jpg", "png", "pdf"],
    },
    email: {
      smtp_host: "",
      smtp_port: "",
      smtp_user: "",
      smtp_password: "",
      from_email: "",
      reply_to: "",
    },
    interview: {
      default_question_count: 5,
      min_question_count: 3,
      max_question_count: 10,
      default_interview_duration: 30,
      recording_enabled: true,
    },
    security: {
      password_min_length: 8,
      password_requires_special: true,
      password_requires_number: true,
      session_timeout: 30,
      max_login_attempts: 5,
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("system");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getSettings();
      setSettings(data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load settings: " + err.message);
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setError("");
      setSuccess("");
      await adminApi.updateSettings(settings);
      setSuccess("Settings updated successfully");
    } catch (err) {
      setError("Failed to update settings: " + err.message);
    }
  };

  const handleInputChange = (section, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
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
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-500 p-4 rounded-md mb-8">
          {success}
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* Settings Navigation */}
        <div className="col-span-3">
          <div className="card">
            <nav className="space-y-1">
              {Object.keys(settings).map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveTab(section)}
                  className={`w-full text-left px-4 py-2 rounded-md ${
                    activeTab === section
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {section.charAt(0).toUpperCase() + section.slice(1)} Settings
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Settings Form */}
        <div className="col-span-9">
          <div className="card">
            <h2 className="text-xl font-bold mb-6">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings
            </h2>

            <div className="space-y-6">
              {Object.entries(settings[activeTab]).map(([field, value]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field
                      .split("_")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" ")}
                  </label>

                  {typeof value === "boolean" ? (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          handleInputChange(activeTab, field, e.target.checked)
                        }
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        {value ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  ) : typeof value === "number" ? (
                    <input
                      type="number"
                      value={value}
                      onChange={(e) =>
                        handleInputChange(
                          activeTab,
                          field,
                          parseInt(e.target.value)
                        )
                      }
                      className="input-field"
                    />
                  ) : Array.isArray(value) ? (
                    <div className="space-y-2">
                      {value.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const newArray = [...value];
                              newArray[index] = e.target.value;
                              handleInputChange(activeTab, field, newArray);
                            }}
                            className="input-field"
                          />
                          <button
                            onClick={() => {
                              const newArray = value.filter(
                                (_, i) => i !== index
                              );
                              handleInputChange(activeTab, field, newArray);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          handleInputChange(activeTab, field, [...value, ""])
                        }
                        className="text-primary hover:text-secondary text-sm"
                      >
                        + Add Item
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        handleInputChange(activeTab, field, e.target.value)
                      }
                      className="input-field"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8">
              <button onClick={handleSaveSettings} className="btn-primary">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
