import os

MONGODB_URL = os.getenv(
	"MONGODB_URL",
	"mongodb+srv://durairaj_db_user:Durai0511@cluster0.zk3c8dy.mongodb.net/hrms?appName=Cluster0"
)
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
