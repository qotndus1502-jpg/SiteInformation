module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: "/home/ubuntu/app/web",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        NEXT_PUBLIC_API_BASE: "http://localhost:8001",
      },
    },
    {
      name: "backend",
      cwd: "/home/ubuntu/app/backend",
      interpreter: "/home/ubuntu/app/backend/venv/bin/python",
      script: "-m",
      args: "uvicorn main:app --host 127.0.0.1 --port 8001",
      env: {
        // These will be loaded from .env in the backend directory
      },
    },
  ],
};
