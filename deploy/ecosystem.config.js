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
      script: "/home/ubuntu/app/backend/venv/bin/uvicorn",
      args: "main:app --host 127.0.0.1 --port 8001",
      interpreter: "none",  // PM2의 Node wrapper 우회 — shebang으로 직접 exec
      env: {
        // .env in cwd is loaded by the FastAPI app itself (python-dotenv).
      },
    },
  ],
};
