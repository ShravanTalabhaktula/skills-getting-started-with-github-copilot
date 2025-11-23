document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape HTML
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper to compute initials from an email or name
  function initialsFromIdentifier(id) {
    if (!id) return "";
    // try to use name part before @, split on non-alphanum
    const namePart = id.split("@")[0].replace(/[\W_]+/g, " ").trim();
    const parts = namePart.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return id.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list markup safely
        const participants = Array.isArray(details.participants) ? details.participants : [];
        const participantsItems = participants.length
          ? participants
              .map((p) => {
                const safe = escapeHtml(p);
                const initials = initialsFromIdentifier(p);
                // add a remove button with data attributes for delegation
                return `<li class="participant">
                          <span class="avatar">${escapeHtml(initials)}</span>
                          <span class="participant-name">${safe}</span>
                          <button class="remove-btn" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" title="Unregister">🗑️</button>
                        </li>`;
              })
              .join("")
          : `<li class="participant empty">No participants yet</li>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5>Participants</h5>
            <ul class="participants-list">
              ${participantsItems}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Delegated click handler to remove a participant
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".remove-btn");
    if (!btn) return;

    const activity = btn.dataset.activity;
    const email = btn.dataset.email;
    if (!activity || !email) return;

    if (!confirm(`Remove ${email} from "${activity}"?`)) return;

    try {
      const resp = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const body = await resp.json();
      if (resp.ok) {
        messageDiv.textContent = body.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        // refresh list to reflect removal
        fetchActivities();
      } else {
        messageDiv.textContent = body.detail || "Failed to remove participant";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
      setTimeout(() => messageDiv.classList.add("hidden"), 4000);
    } catch (err) {
      console.error("Error removing participant:", err);
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 4000);
    }
  });

  // Initialize app
  fetchActivities();
});
