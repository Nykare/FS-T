# typless Technical task

Instructions for Visual Studio Code (VSC).

## Setup instructions

### Open Terminal

Open a terminal in VSC from **Terminal > New Terminal**.

### Clone the repository

Clone the repository and navigate to its directory.

```
git clone https://github.com/Nykare/FS-T
cd FS-T
```

### Back-end setup

Enter backend directory.

```
cd backend
```

Set up virtual environment.

```
python3 -m venv path/to/venv
source path/to/venv/bin/activate
```

Install requirements.

```
python3 -m pip install flask flask-cors requests
```

Run back-end server.

```
python3 app.py
```

### Front-end setup

Open new terminal in VSC from **Terminal > New Terminal** and enter frontend directory.

```
cd frontend
```

Run **npm** and start front-end server.

```
npm install
npm start
```
