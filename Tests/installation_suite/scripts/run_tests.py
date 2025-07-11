#!/usr/bin/env python3
"""
Test runner script for SuperClaude Installation Suite Test Battery.

Provides unified test execution with filtering, reporting, and CI/CD integration.
"""

import sys
import argparse
import subprocess
import time
from pathlib import Path

# Add project paths
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "Scripts"))


def run_command(cmd, description="", timeout=300):
    """Run a command with timeout and error handling."""
    print(f"\n🔄 {description}")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        start_time = time.time()
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=Path(__file__).parent.parent
        )
        duration = time.time() - start_time
        
        if result.returncode == 0:
            print(f"✅ {description} completed in {duration:.2f}s")
            if result.stdout:
                print(f"Output: {result.stdout[:500]}...")
        else:
            print(f"❌ {description} failed in {duration:.2f}s")
            if result.stderr:
                print(f"Error: {result.stderr[:500]}...")
        
        return result.returncode == 0, result.stdout, result.stderr
    
    except subprocess.TimeoutExpired:
        print(f"⏰ {description} timed out after {timeout}s")
        return False, "", f"Timeout after {timeout}s"
    except Exception as e:
        print(f"💥 {description} failed with exception: {e}")
        return False, "", str(e)


def install_test_dependencies():
    """Install test dependencies."""
    print("🔧 Installing test dependencies...")
    
    # Install from requirements.txt
    requirements_file = Path(__file__).parent.parent / "requirements.txt"
    
    if requirements_file.exists():
        success, stdout, stderr = run_command([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ], "Installing test requirements")
        
        if not success:
            print(f"⚠️ Failed to install requirements: {stderr}")
            return False
    else:
        print("⚠️ Test requirements.txt not found")
    
    return True


def run_unit_tests(args):
    """Run unit tests."""
    cmd = [sys.executable, "-m", "pytest", "unit/"]
    
    if args.verbose:
        cmd.append("-v")
    if args.coverage:
        cmd.extend(["--cov=../../Scripts", "--cov-report=html", "--cov-report=term"])
    if args.markers:
        cmd.extend(["-m", args.markers])
    if args.parallel:
        cmd.extend(["-n", str(args.parallel)])
    
    return run_command(cmd, "Running unit tests", timeout=600)


def run_integration_tests(args):
    """Run integration tests."""
    cmd = [sys.executable, "-m", "pytest", "integration/"]
    
    if args.verbose:
        cmd.append("-v")
    if args.coverage:
        cmd.extend(["--cov=../../Scripts", "--cov-append"])
    if args.markers:
        cmd.extend(["-m", args.markers])
    if args.parallel:
        cmd.extend(["-n", str(args.parallel)])
    
    return run_command(cmd, "Running integration tests", timeout=900)


def run_e2e_tests(args):
    """Run end-to-end tests."""
    cmd = [sys.executable, "-m", "pytest", "e2e/"]
    
    if args.verbose:
        cmd.append("-v")
    if args.coverage:
        cmd.extend(["--cov=../../Scripts", "--cov-append"])
    if args.markers:
        cmd.extend(["-m", args.markers])
    if not args.slow:
        cmd.extend(["-m", "not slow"])
    
    return run_command(cmd, "Running end-to-end tests", timeout=1800)


def run_performance_tests(args):
    """Run performance tests."""
    cmd = [sys.executable, "-m", "pytest", "performance/"]
    
    if args.verbose:
        cmd.append("-v")
    if args.benchmark:
        cmd.append("--benchmark-only")
    if args.markers:
        cmd.extend(["-m", args.markers])
    
    return run_command(cmd, "Running performance tests", timeout=1200)


def run_specific_tests(test_pattern, args):
    """Run specific test pattern."""
    cmd = [sys.executable, "-m", "pytest", test_pattern]
    
    if args.verbose:
        cmd.append("-v")
    if args.coverage:
        cmd.extend(["--cov=../../Scripts"])
    if args.markers:
        cmd.extend(["-m", args.markers])
    
    return run_command(cmd, f"Running tests: {test_pattern}", timeout=900)


def generate_coverage_report():
    """Generate coverage report."""
    print("\n📊 Generating coverage report...")
    
    # Generate HTML report
    success, stdout, stderr = run_command([
        sys.executable, "-m", "coverage", "html", "--directory=htmlcov"
    ], "Generating HTML coverage report")
    
    if success:
        print("✅ Coverage report generated in htmlcov/")
    
    # Generate terminal report
    success, stdout, stderr = run_command([
        sys.executable, "-m", "coverage", "report", "--show-missing"
    ], "Generating terminal coverage report")
    
    if success and stdout:
        print("\n📈 Coverage Summary:")
        print(stdout)


def run_quality_checks():
    """Run code quality checks."""
    print("\n🔍 Running quality checks...")
    
    # Run flake8 if available
    try:
        success, stdout, stderr = run_command([
            sys.executable, "-m", "flake8", ".", "--count", "--select=E9,F63,F7,F82", "--show-source", "--statistics"
        ], "Running flake8 quality checks")
        
        if success:
            print("✅ Code quality checks passed")
    except:
        print("ℹ️ Flake8 not available, skipping quality checks")


def run_test_discovery():
    """Run test discovery to validate test structure."""
    print("\n🔍 Running test discovery...")
    
    success, stdout, stderr = run_command([
        sys.executable, "-m", "pytest", "--collect-only", "-q"
    ], "Discovering tests")
    
    if success and stdout:
        test_count = len([line for line in stdout.split('\n') if 'test session starts' in line or 'collected' in line])
        print(f"✅ Test discovery completed - found tests")
        print(stdout[-500:])  # Show last 500 chars
    
    return success


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description="SuperClaude Installation Suite Test Battery")
    
    # Test selection
    parser.add_argument("--unit", action="store_true", help="Run unit tests")
    parser.add_argument("--integration", action="store_true", help="Run integration tests")
    parser.add_argument("--e2e", action="store_true", help="Run end-to-end tests")
    parser.add_argument("--performance", action="store_true", help="Run performance tests")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--pattern", help="Run specific test pattern")
    
    # Test configuration
    parser.add_argument("--coverage", action="store_true", help="Generate coverage report")
    parser.add_argument("--benchmark", action="store_true", help="Run benchmark tests")
    parser.add_argument("--slow", action="store_true", help="Include slow tests")
    parser.add_argument("--markers", help="Run tests with specific markers")
    parser.add_argument("--parallel", type=int, help="Run tests in parallel (number of workers)")
    
    # Output configuration
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--quiet", action="store_true", help="Quiet output")
    parser.add_argument("--no-install", action="store_true", help="Skip dependency installation")
    parser.add_argument("--no-quality", action="store_true", help="Skip quality checks")
    
    # CI/CD options
    parser.add_argument("--ci", action="store_true", help="CI mode (quiet, no interactive)")
    parser.add_argument("--timeout", type=int, default=1800, help="Test timeout in seconds")
    
    args = parser.parse_args()
    
    # CI mode configuration
    if args.ci:
        args.quiet = True
        args.coverage = True
        args.no_quality = False
    
    print("🚀 SuperClaude Installation Suite Test Battery")
    print("=" * 60)
    
    # Install dependencies
    if not args.no_install:
        if not install_test_dependencies():
            print("❌ Failed to install test dependencies")
            return 1
    
    # Run test discovery
    if not run_test_discovery():
        print("❌ Test discovery failed")
        return 1
    
    results = []
    
    # Run selected tests
    if args.pattern:
        success, stdout, stderr = run_specific_tests(args.pattern, args)
        results.append(("Pattern", success))
    
    elif args.all:
        # Run all test categories
        success, stdout, stderr = run_unit_tests(args)
        results.append(("Unit", success))
        
        success, stdout, stderr = run_integration_tests(args)
        results.append(("Integration", success))
        
        success, stdout, stderr = run_e2e_tests(args)
        results.append(("E2E", success))
        
        success, stdout, stderr = run_performance_tests(args)
        results.append(("Performance", success))
    
    else:
        # Run selected test categories
        if args.unit:
            success, stdout, stderr = run_unit_tests(args)
            results.append(("Unit", success))
        
        if args.integration:
            success, stdout, stderr = run_integration_tests(args)
            results.append(("Integration", success))
        
        if args.e2e:
            success, stdout, stderr = run_e2e_tests(args)
            results.append(("E2E", success))
        
        if args.performance:
            success, stdout, stderr = run_performance_tests(args)
            results.append(("Performance", success))
        
        # Default to unit tests if nothing specified
        if not any([args.unit, args.integration, args.e2e, args.performance]):
            success, stdout, stderr = run_unit_tests(args)
            results.append(("Unit", success))
    
    # Generate reports
    if args.coverage:
        generate_coverage_report()
    
    if not args.no_quality:
        run_quality_checks()
    
    # Print results summary
    print("\n📋 Test Results Summary")
    print("=" * 30)
    
    all_passed = True
    for test_type, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_type:12} {status}")
        if not success:
            all_passed = False
    
    print("=" * 30)
    
    if all_passed:
        print("🎉 All tests passed!")
        return 0
    else:
        print("💥 Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())