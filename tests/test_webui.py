import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"


def api_endpoint(endpoint, method="GET", data=None):
    """测试API端点"""
    try:
        url = f"{BASE_URL}{endpoint}"
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            if isinstance(data, dict):
                response = requests.post(url, data=data)
            else:
                response = requests.post(url)

        print(f"✅ {method} {endpoint}: {response.status_code}")
        if response.status_code == 200:
            try:
                return response.json()
            except Exception:
                return None
        else:
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ {method} {endpoint}: {e}")
        return None


def run_comprehensive_test():
    """运行全面测试"""
    print("🚀 Starting RPT Web UI Comprehensive Test")
    print("=" * 50)

    # 1. 测试基础状态端点
    print("\n1. Testing Basic Status Endpoints:")
    print(api_endpoint("/api/status"))
    print(api_endpoint("/api/files"))
    print(api_endpoint("/api/tasks"))

    # 2. 测试USRP连接
    print("\n2. Testing USRP Connection:")
    print(api_endpoint("/api/connect", "POST"))

    # 3. 测试信号生成
    print("\n3. Testing Signal Generation:")
    generate_data = {
        "center_freq": "100000000",
        "symbol_rate": "500000",
        "sample_rate": "2000000",
        "duration": "1.0",
        "save_file": "test_generated.h5",
    }
    print(api_endpoint("/api/generate", "POST", generate_data))

    # 4. 测试文件操作
    print("\n4. Testing File Operations:")
    # 先检查文件列表
    files = api_endpoint("/api/files")
    if files and 'files' in files:
        print(f"   Found {len(files['files'])} files")

        # 如果有文件，测试分析功能
        if files['files']:
            first_file = files['files'][0]['name']
            print(f"   Testing analysis on: {first_file}")
            print(api_endpoint("/api/analyze", "POST", {"filename": first_file}))

    # 5. 测试任务系统
    print("\n5. Testing Task System:")
    tasks = test_api_endpoint("/api/tasks")
    if tasks and 'tasks' in tasks:
        print(f"   Found {len(tasks['tasks'])} tasks")

    print("\n" + "=" * 50)
    print("🎉 Comprehensive Test Completed!")


if __name__ == "__main__":
    run_comprehensive_test()
