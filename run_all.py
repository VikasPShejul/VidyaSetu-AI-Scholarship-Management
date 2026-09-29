import os
import subprocess
import sys
import time


ROOT = os.path.dirname(os.path.abspath(__file__))

BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")

PYTHON = os.path.join(
    BACKEND_DIR,
    "venv",
    "Scripts",
    "python.exe"
)


backend_process = None
frontend_process = None


def main():

    global backend_process
    global frontend_process

    print("=" * 60)
    print("        TRIBAL SCHOLAR DEVELOPMENT SERVER")
    print("=" * 60)

    # ------------------------------------------------
    # Check Python
    # ------------------------------------------------

    if not os.path.exists(PYTHON):

        print("\nERROR: Backend virtual environment not found.")
        print(PYTHON)

        input("\nPress ENTER to exit...")
        return

    print("\n[1/2] Starting FastAPI backend...")

    backend_process = subprocess.Popen(
        [
            PYTHON,
            "-m",
            "uvicorn",
            "app:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
            "--reload"
        ],
        cwd=BACKEND_DIR
    )

    time.sleep(3)

    # ------------------------------------------------
    # Start React
    # ------------------------------------------------

    print("[2/2] Starting React frontend...")

    frontend_process = subprocess.Popen(
        "npm run dev",
        cwd=FRONTEND_DIR,
        shell=True
    )

    print("\n" + "=" * 60)
    print("SERVERS STARTED")
    print("=" * 60)

    print("\nBackend : http://127.0.0.1:8000")
    print("Swagger : http://127.0.0.1:8000/docs")
    print("Frontend: http://localhost:5173")

    print("\nPress CTRL+C to stop the servers.")
    print("=" * 60)

    try:

        while True:

            # Check backend
            if backend_process.poll() is not None:

                print("\n[ERROR] FastAPI stopped.")

                break

            # Check frontend
            if frontend_process.poll() is not None:

                print("\n[ERROR] React stopped.")

                break

            time.sleep(1)

    except KeyboardInterrupt:

        print("\n\nStopping servers...")

    finally:

        stop_servers()


def stop_servers():

    global backend_process
    global frontend_process

    if backend_process:

        try:
            backend_process.terminate()
        except Exception:
            pass

    if frontend_process:

        try:
            frontend_process.terminate()
        except Exception:
            pass

    print("Servers stopped.")


if __name__ == "__main__":
    main()