WAR ROOM

WAR ROOM is a centralized Cybersecurity Workshop & Hackathon Management Platform developed by SynthoQuest Private Limited. It is designed to manage cybersecurity events, participants, challenges, answer submissions, automated scoring, and leaderboards from a single platform.

🚀 What is WAR ROOM?

WAR ROOM simplifies the management of cybersecurity workshops and hackathons by bringing the complete event workflow into one centralized system.

Instead of managing participants, challenge files, answers, scores, and leaderboards through multiple platforms and spreadsheets, WAR ROOM provides a unified environment for administrators and participants.

Core Workflow
Event
  ↓
Participant Registration
  ↓
Admin Approval
  ↓
User Login
  ↓
Toolkit / Challenges
  ↓
Answer Submission
  ↓
Backend Validation
  ↓
Automatic Points
  ↓
Leaderboard
🎯 Why WAR ROOM?

Traditional cybersecurity events often require administrators to manage:

Google Drive links for toolkits
Separate registration forms
Manual participant verification
Manual answer checking
Manual score calculation
Separate leaderboard spreadsheets
Participant and team management
Event ON/OFF controls

WAR ROOM brings these activities together into a centralized platform.

✨ Key Features
👨‍💼 Admin Dashboard

WAR ROOM provides a dedicated administrative dashboard for managing cybersecurity events.

Administrators can manage:

Workshop events
Hackathon events
Cybersecurity domains
Participants
Hackathon teams
Toolkits
Challenge configurations
Leaderboard visibility
User accounts
Event controls
Admin credentials
🎓 Workshop Management

The platform supports cybersecurity workshops across multiple domains.

Supported Domains
CEH
VAPT
SOC
Digital Forensics

Administrators can control the availability of individual workshop domains.

🏆 Hackathon Management

WAR ROOM also supports cybersecurity hackathon management.

Hackathon domains include:

CEH
VAPT
SOC
Digital Forensics

The platform supports team-based hackathon registration and management.

👤 Participant Registration & Login

Participants can create accounts and access their event environment.

The registration system includes:

Name
Email
Phone number
Password
Domain selection
Account validation
Administrator approval

After approval, participants can log in and access the relevant event.

🔐 Secure Authentication

The platform provides backend-based authentication for users and administrators.

Features include:

Password hashing
Session-based authentication
User sessions
Admin sessions
Password policy validation
Email validation
Indian mobile number validation
Account approval workflow
📚 Centralized Toolkit Management

Administrators can upload and manage event-specific toolkits.

Separate toolkit management is provided for:

Workshops
Hackathons

Participants can access the toolkit associated with their event.

This reduces dependency on repeatedly sharing external toolkit links.

🧩 Cybersecurity Challenges

WAR ROOM provides a structured challenge and answer-submission workflow for cybersecurity activities.

Participants can work through challenges associated with their selected domain.

The platform supports challenge categories and challenge numbers for organized CTF-style activities.

WAR ROOM is designed as an event and challenge management platform. It is not intended to provide browser-based attack machines, vulnerable virtual machines, Kali Linux instances, Docker labs, or remote attack environments.

⚡ Automated Answer Validation

Participants submit answers through the platform.

The backend validates the submitted answer and determines whether the challenge was solved correctly.

Answer Submission
       ↓
Backend Validation
       ↓
Correct / Incorrect
       ↓
Points Awarded

This removes the need for administrators to manually verify every answer.

🏅 Automatic Scoring

Each challenge can have an assigned score.

When a participant successfully solves a challenge:

Challenge
    ↓
Correct Answer
    ↓
Assigned Points
    ↓
User Score Updated

The platform stores challenge submissions and awarded points so participant progress can be maintained.

📊 Live Leaderboard

WAR ROOM provides leaderboard functionality for event participants.

Users can start with:

0 Points

and their score increases as they successfully complete challenges.

Example:

Rank	Participant	Domain	Points
1	Participant A	VAPT	85
2	Participant B	VAPT	60
3	Participant C	VAPT	40
4	Participant D	VAPT	0

The same scoring information can be viewed by administrators for event monitoring.

👥 Participant Management

Administrators can monitor registered participants and their event information.

The system maintains information such as:

Participant identity
Email
Phone
Domain
Registration status
Login/session information
Challenge progress
Points
🏢 Hackathon Team Management

For hackathons, WAR ROOM supports team-oriented registration.

Teams can have:

Team name
Team members
Team lead
Domain
Team credentials
Registration status

This allows hackathon participation to be managed separately from individual workshop participants.

🎛️ Event ON/OFF Controls

Administrators can control the availability of different parts of the platform.

The system supports controls for:

Home Events
Workshop
Hackathon
Workshop Domains
CEH
VAPT
SOC
Digital Forensics
Hackathon Domains
CEH
VAPT
SOC
Digital Forensics
Leaderboards
Workshop leaderboard
Hackathon leaderboard

This allows administrators to control which activities are currently available.

💾 Persistent Data Management

WAR ROOM maintains persistent event data for important platform operations.

The platform stores information related to:

Users
Registrations
Sessions
Account data
Challenge submissions
Points
Leaderboard information
Hackathon teams
Administrative information

For the deployed environment, persistent PostgreSQL/Neon storage is used so important user and event information is not dependent on temporary server runtime storage.

🛡️ Cybersecurity-Focused Domains

WAR ROOM is designed specifically around cybersecurity learning and competitions.

The supported areas include:

CEH

Ethical hacking and penetration-testing-oriented challenges.

VAPT

Vulnerability assessment and penetration-testing activities.

SOC

Security operations and security monitoring-oriented activities.

Digital Forensics

Investigation and digital evidence-oriented activities.

🔄 Centralized Event Workflow

WAR ROOM connects the complete event lifecycle:

┌─────────────────────┐
│       EVENT         │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│    REGISTRATION     │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   ADMIN APPROVAL    │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│       LOGIN         │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│      TOOLKIT        │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│     CHALLENGES      │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   ANSWER SUBMISSION │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ BACKEND VALIDATION  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│   AUTOMATIC POINTS  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│     LEADERBOARD     │
└─────────────────────┘
🧑‍💻 Technology Stack

WAR ROOM is built using:

Python
FastAPI
PostgreSQL / Neon
SQLite for local development
HTML
CSS
JavaScript
REST APIs
Session-based authentication
📈 Benefits

WAR ROOM helps organizations and educational institutions:

Centralize cybersecurity event management
Reduce manual administration
Automate challenge evaluation
Automate participant scoring
Maintain structured participant records
Provide real-time leaderboard information
Manage workshops and hackathons from one dashboard
Organize cybersecurity challenges by domain
Reduce dependency on spreadsheets
Improve the overall participant experience
🏫 Suitable For

WAR ROOM can be used for:

Cybersecurity workshops
College cybersecurity events
Technical workshops
Cybersecurity competitions
CTF-style challenge events
Hackathons
Student skill-development programs
Cybersecurity training programs
Industry-academia cybersecurity events
🔮 Project Vision

WAR ROOM aims to provide a centralized platform for conducting and managing cybersecurity learning events, competitions, workshops, and hackathons while reducing manual event administration and providing automated challenge evaluation and scoring.

🏢 Developed By

SynthoQuest Private Limited

WAR ROOM — Cybersecurity Event Management Platform
