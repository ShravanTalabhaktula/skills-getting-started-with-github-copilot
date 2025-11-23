import sys
from pathlib import Path

# Ensure the `src` directory is importable
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_root_redirect_location():
    # Do not follow redirects so we can assert the location header
    r = client.get("/", follow_redirects=False)
    assert r.status_code in (301, 302, 303, 307)
    assert r.headers["location"] == "/static/index.html"


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    assert "Soccer Team" in data


def test_signup_and_remove_flow():
    email = "test.student@mergington.edu"
    activity = "Chess Club"

    # Sign up should succeed
    r = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    # Signing up again should return 400 (already signed up for an activity)
    r2 = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r2.status_code == 400

    # Remove the participant
    r3 = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert r3.status_code == 200
    assert "Removed" in r3.json().get("message", "")


def test_signup_nonexistent_activity():
    r = client.post("/activities/NotAThing/signup", params={"email": "x@y.com"})
    assert r.status_code == 404


def test_remove_nonexistent_participant():
    # Attempt to remove an email that is not in the participants list
    r = client.delete("/activities/Soccer Team/participants", params={"email": "noone@example.com"})
    assert r.status_code == 404
