import numpy as np
import requests
import json
import time
from pathlib import Path


def create_test_signal_file():
    """创建测试信号文件"""
    # 生成测试信号
    sample_rate = 2e6
    duration = 0.1
    t = np.arange(0, duration, 1/sample_rate)

    # 创建QPSK-like信号
    carrier_freq = 100e3
    i_component = np.cos(2 * np.pi * carrier_freq * t)
    q_component = np.sin(2 * np.pi * carrier_freq * t)
    samples = i_component + 1j * q_component

    # 添加噪声
    noise = 0.1 * (np.random.randn(len(samples)) + 1j * np.random.randn(len(samples)))
    samples += noise

    # 保存为文件
    from core.file_manager import FileManager, SignalMetadata
    from datetime import datetime

    file_manager = FileManager()
    metadata = SignalMetadata(
        sample_rate=sample_rate,
        center_freq=100e6,
        timestamp=datetime.now().isoformat(),
        duration=duration,
        samples_count=len(samples),
        signal_type="TEST_QPSK",
    )

    # prefer HDF5 if available, otherwise fall back to binary
    try:
        from core.file_manager import H5PY_AVAILABLE
    except Exception:
        H5PY_AVAILABLE = False

    test_filename = "test_integration.h5" if H5PY_AVAILABLE else "test_integration.bin"
    out_path = Path("var/uploads")
    out_path.mkdir(parents=True, exist_ok=True)
    success = file_manager.save_signal(samples, metadata, str(out_path / test_filename))

    return success, test_filename


def test_analysis_integration():
    """测试分析集成"""
    print("🧪 Testing Analysis Integration")
    print("=" * 50)

    # 创建测试文件
    print("1. Creating test signal file...")
    success, filename = create_test_signal_file()
    assert success, "Failed to create test file"
    print(f"✅ Test file created: {filename}")

    # 测试API端点
    print("2. Testing /api/analyze endpoint...")
    try:
        start_time = time.time()
        response = requests.post(
            "http://127.0.0.1:8000/api/analyze",
            data={"filename": filename},
            timeout=60  # 分析可能需要时间
        )
        elapsed_time = time.time() - start_time

        # Expect background task started
        assert response.status_code == 200, f"Start failed: {response.status_code}"
        start_data = response.json()
        assert start_data.get('success') is True, "Start not successful"
        assert 'task_id' in start_data, "No task ID returned"

        task_id = start_data['task_id']
        print(f"✅ Analysis started, task ID: {task_id}")

        # Poll for result
        max_attempts = 30
        for attempt in range(max_attempts):
            status_response = requests.get(f"http://127.0.0.1:8000/api/analysis/{task_id}")
            assert status_response.status_code == 200, f"Status failed: {status_response.status_code}"
            status_data = status_response.json()

            if status_data.get('status') == 'completed':
                print("✅ Analysis completed successfully!")
                # result payload likely contains analysis + plots
                assert status_data.get('analysis') is not None or status_data.get('plots') is not None
                # check plots exist on disk
                plots = status_data.get('plots', {})
                plot_dir = Path("var/uploads/plots")
                for plot_name, plot_url in plots.items():
                    plot_filename = plot_url.split('/')[-1]
                    plot_path = plot_dir / plot_filename
                    assert plot_path.exists(), f"Plot file {plot_filename} does not exist"
                return
            elif status_data.get('status') == 'failed':
                raise AssertionError(f"Analysis task failed: {status_data.get('error')}")
            else:
                print(f"   Attempt {attempt + 1}/{max_attempts}: Analysis running...")
                time.sleep(2)

        raise AssertionError("Analysis timed out")

    except Exception:
        import traceback
        traceback.print_exc()
        raise


def test_visualizer_direct():
    """直接测试可视化器"""
    print("\n3. Testing visualizer directly...")
    try:
        from utils.visualizer import EnhancedSignalVisualizer

        # 生成测试信号
        sample_rate = 2e6
        duration = 0.05
        t = np.arange(0, duration, 1/sample_rate)
        samples = np.exp(1j * 2 * np.pi * 100e3 * t) + 0.1 * (np.random.randn(len(t)) + 1j * np.random.randn(len(t)))

        # 测试可视化器
        visualizer = EnhancedSignalVisualizer()
        plot_files = visualizer.create_analysis_plots(
            samples=samples,
            sample_rate=sample_rate,
            center_freq=100e6,
            filename="direct_test"
        )

        print(f"✅ Visualizer generated {len(plot_files)} plots")
        for plot_type, filename in plot_files.items():
            plot_path = Path("var/uploads/plots") / filename
            exists = plot_path.exists()
            status = "✅" if exists else "❌"
            print(f"   {status} {plot_type}: {filename}")
            assert exists, f"Plot file {filename} was not created"
        # ensure at least one plot created
        assert len(plot_files) > 0, "No plots were generated by visualizer"
    except Exception:
        # Re-raise so pytest reports the original traceback
        raise


if __name__ == "__main__":
    print("🚀 Enhanced Analysis Integration Test Suite")
    print("Note: Ensure server is running on http://127.0.0.1:8000")
    print("=" * 60)

    # 测试可视化器
    visualizer_ok = test_visualizer_direct()

    # 测试集成（需要服务器）
    integration_ok = False
    try:
        integration_ok = test_analysis_integration()
    except Exception as e:
        print(f"⚠️  Integration test skipped: {e}")

    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY:")
    print(f"  Visualizer: {'PASS' if visualizer_ok else 'FAIL'}")
    print(f"  Integration: {'PASS' if integration_ok else 'FAIL/NEEDS_SERVER'}")

    if visualizer_ok and integration_ok:
        print("🎉 All tests passed! Enhanced analysis is working correctly.")
    else:
        print("⚠️  Some tests need attention.")
