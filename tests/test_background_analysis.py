import requests
import time
from pathlib import Path


def test_background_analysis():
    """测试后台分析功能"""
    print("🧪 Testing Background Analysis")
    print("=" * 50)

    test_filename = "hf_record_10MHz_2000kHz_20251102_194110.h5"

    # 1. 启动分析任务
    print("1. Starting analysis task...")
    start_response = requests.post(
        "http://127.0.0.1:8000/api/analyze",
        data={"filename": test_filename},
        timeout=10
    )

    assert start_response.status_code == 200, f"Start failed: {start_response.status_code}"
    start_data = start_response.json()

    assert start_data["success"] is True, "Start not successful"
    assert "task_id" in start_data, "No task ID returned"

    task_id = start_data["task_id"]
    print(f"✅ Analysis started, task ID: {task_id}")

    # 2. 轮询任务状态
    print("2. Polling for results...")
    max_attempts = 30
    for attempt in range(max_attempts):
        status_response = requests.get(f"http://127.0.0.1:8000/api/analysis/{task_id}", timeout=10)
        assert status_response.status_code == 200, f"Status failed: {status_response.status_code}"
        status_data = status_response.json()

        if status_data.get("status") == "completed":
            print("✅ Analysis completed successfully!")
            print(f"📊 Results: {len(status_data.get('analysis', {}))} metrics")
            print(f"🖼️  Plots: {len(status_data.get('plots', {}))} images")
            return
        elif status_data.get("status") == "failed":
            raise AssertionError(f"Analysis failed: {status_data.get('error')}")
        else:
            print(f"   Attempt {attempt + 1}/{max_attempts}: Analysis running...")
            time.sleep(2)

    raise AssertionError("Analysis timed out")


def test_task_manager_integration():
    """测试任务管理器集成"""
    print("\n3. Testing Task Manager Integration...")

    response = requests.get("http://127.0.0.1:8000/api/tasks")
    assert response.status_code == 200, "Tasks endpoint failed"
    tasks_data = response.json()
    print(f"✅ Task manager responding, {len(tasks_data.get('tasks', []))} tasks")