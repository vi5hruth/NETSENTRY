\# NETSENTRY — AI-Powered Network Threat Detection



\## Overview



NETSENTRY is a network security project that combines rule-based detection and machine learning to identify potentially suspicious network traffic patterns.



The project provides a React dashboard and a FastAPI backend for simulating traffic scenarios, analyzing flows, and displaying security alerts.



\## Features



\- Interactive security operations dashboard.

\- Network-flow analysis using Python.

\- Rule-based suspicious traffic detection.

\- Isolation Forest anomaly detection.

\- Simulated normal traffic, port scans, and high-volume traffic.

\- Alert acknowledgement and simulated response actions.

\- Automated tests for detection logic.



\## Technology Stack



\- \*\*Frontend:\*\* React, Vite, JavaScript, CSS

\- \*\*Backend:\*\* Python, FastAPI

\- \*\*Machine Learning:\*\* Scikit-learn, Isolation Forest

\- \*\*Testing:\*\* Pytest

\- \*\*Version Control:\*\* Git and GitHub



\## Project Structure



```text

NETSENTRY/

├── backend/

│   └── app/

├── frontend/

│   └── src/

├── tests/

├── .gitignore

└── README.md

```



\## Running the Project



\### 1. Start the backend



Open PowerShell in the project directory:



```powershell

.\\.venv\\Scripts\\Activate.ps1

python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001

```



The backend runs at `http://127.0.0.1:8001`.



Interactive API documentation is available at `http://127.0.0.1:8001/docs`.



\### 2. Start the frontend



Open a second PowerShell terminal:



```powershell

cd C:\\Users\\Admin\\Desktop\\NETSENTRY\\frontend

npm run dev

```



Open `http://localhost:5173/` in your browser.



\## Demonstration Scenarios



NETSENTRY includes simulated traffic scenarios:



\- \*\*Normal:\*\* Demonstrates ordinary traffic.

\- \*\*Port Scan:\*\* Demonstrates traffic patterns associated with port scanning.

\- \*\*High Volume:\*\* Demonstrates unusually high traffic volume.



Use the dashboard controls to run the simulations and inspect the resulting flows and alerts.



\## Testing



Run the automated tests from the project root:



```powershell

.\\.venv\\Scripts\\Activate.ps1

python -m pytest tests -v

```



Build the frontend:



```powershell

cd frontend

npm run build

```



\## Limitations



NETSENTRY is an academic prototype that demonstrates traffic analysis using simulated data. It is not yet a complete live network-monitoring or intrusion-prevention system.



The simulated response actions do not block actual network traffic. Detection performance should be evaluated using representative datasets before real-world deployment.



\## Future Enhancements



\- Live network-flow collection.

\- Testing with labelled network-traffic datasets.

\- Improved alert filtering and investigation.

\- Persistent storage for traffic and alerts.

\- Integration with suitable network-security tools.



\## Author



Developed as an academic project focused on network security and machine-learning-based anomaly detection.

