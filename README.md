Q1. Build useStorageSync hook that handles draft with quota handling, filters in sessionStorage, auth via js-cookie, storage event listener, iframe postMessage with origin check, BroadcastChannel sync.



Q2. Implement React Router, Note Collaboration, and Session ManagementScenario
A user opens Fundoo Notes and navigates between the following pages:
/notes
/archive
/shared
/labels/:labelName
The application also supports collaboration. A user can open a note, enter another user's email address, and invite that user to collaborate.
For the learning implementation, the application must prevent unauthenticated users from accessing the notes pages and provide a simple collaboration interface.
Requirements
Implement routes using React Router.
Create a protected route.
Store a temporary authentication indicator in sessionStorage.
Implement navigation between notes sections.
Create a collaboration form.
Use appropriate UI feedback when a collaborator is invited.
