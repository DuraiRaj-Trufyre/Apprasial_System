
# Apprasial_System

## Running the Frontend

1. Open a terminal and navigate to the `frontend` directory:
	```sh
	cd frontend
	```
2. Install dependencies:
	```sh
	npm install
	```
3. Start the development server:
	```sh
	npm run dev
	```
4. The app will be available at [http://localhost:3000](http://localhost:3000)

---

## Running the Backend

1. Open a terminal and navigate to the `backend` directory:
	```sh
	cd backend
	```
2. (Optional) Create a virtual environment:
	```sh
	python3 -m venv venv
	source venv/bin/activate
	```
3. Install dependencies (make sure you have FastAPI and Uvicorn):
	```sh
	pip install fastapi uvicorn pymongo
	```
4. Start the backend server:
	```sh
	uvicorn app.main:app --reload --port 8000
	```
5. The backend will be available at [http://localhost:8000](http://localhost:8000)

---

## Notes
- Make sure MongoDB connection details in `backend/app/config/settings.py` are correct.
- You may need to create a `requirements.txt` for the backend for easier dependency management.
- For production, use environment variables for secrets and database URLs.
