# Memory Profiling in Empirica

This guide explains how to use the memory profiling features in Empirica to debug memory leaks and performance issues.

> **💡 Need a quick start guide?** If you're experiencing memory issues and just want simple steps to report them, see our [Memory Issue Reporting Guide](MEMORY_ISSUE_GUIDE.md) instead.

## Quick Start

To enable memory profiling when running Empirica:

```bash
empirica serve --tajriba.memprofile.enabled=true --tajriba.memprofile.dir=~/.empirica/profiles
```

This will:
- Enable automatic memory profiling
- Save profile files to `~/.empirica/profiles` directory
- Generate profiles every 5 minutes by default

## Configuration Options

### Basic Profiling
- `--tajriba.memprofile.enabled`: Enable memory profiling (default: false)
- `--tajriba.memprofile.dir`: Directory to save profile files (default: current directory)
- `--tajriba.memprofile.interval`: How often to generate profiles (default: 5m)

### HTTP Profiling Endpoints
- `--tajriba.memprofile.http_enabled`: Enable HTTP pprof endpoints (default: false)  
- `--tajriba.memprofile.http_port`: Port for HTTP endpoints (default: 6060)

## Examples

### Basic Memory Profiling
```bash
# Enable profiling with custom directory and interval
empirica serve --tajriba.memprofile.enabled=true \
               --tajriba.memprofile.dir=~/.empirica/profiles \
               --tajriba.memprofile.interval=2m
```

### HTTP Profiling for Live Analysis
```bash
# Enable HTTP endpoints for live profiling
empirica serve --tajriba.memprofile.http_enabled=true \
               --tajriba.memprofile.http_port=6060
```

Then access profiling data at:
- Memory profile: http://localhost:6060/debug/pprof/heap
- CPU profile: http://localhost:6060/debug/pprof/profile
- Goroutines: http://localhost:6060/debug/pprof/goroutine

### Full Profiling Setup
```bash
# Enable both file and HTTP profiling
empirica serve --tajriba.memprofile.enabled=true \
               --tajriba.memprofile.dir=~/.empirica/profiles \
               --tajriba.memprofile.interval=1m \
               --tajriba.memprofile.http_enabled=true \
               --tajriba.memprofile.http_port=6060
```

## Manual Profile Triggers

If you know the process ID (PID) of your Empirica server, you can trigger manual profile generation:

```bash
# Find the PID
ps aux | grep empirica

# Trigger manual profile (Linux/macOS)
kill -USR1 <PID>
```

## Analyzing Profile Files

Profile files are saved with timestamps (e.g., `memprofile_2024-01-15_14-30-45.pprof`). 

To analyze them with Go's pprof tool:

```bash
# Interactive analysis
go tool pprof memprofile_2024-01-15_14-30-45.pprof

# Generate visual graph (requires graphviz)
go tool pprof -png memprofile_2024-01-15_14-30-45.pprof > memory.png

# Web interface
go tool pprof -http=:8080 memprofile_2024-01-15_14-30-45.pprof
```

## Configuration File

You can also set these options in your `.empirica/empirica.toml` file:

```toml
[tajriba.memprofile]
enabled = true
dir = "~/.empirica/profiles"
interval = "2m"
http_enabled = true
http_port = 6060
```

## Troubleshooting Memory Leaks

1. **Enable profiling with short intervals** during suspected leak periods:
   ```bash
   empirica serve --tajriba.memprofile.enabled=true --tajriba.memprofile.interval=30s
   ```

2. **Monitor profile file sizes** - they should remain relatively stable if there are no leaks

3. **Compare profiles** before and after experiments to identify memory growth

4. **Use HTTP endpoints** for real-time monitoring during experiments

## Performance Impact

Memory profiling has minimal performance impact:
- File profiling: Very low overhead, profiles written asynchronously
- HTTP endpoints: Only active when accessed
- Recommended for production use when debugging issues

## Support

If you encounter memory issues:
1. Enable profiling with the above settings
2. Collect profile files during the problematic period
3. Create a GitHub issue at https://github.com/empiricaly/empirica/issues with the profile files attached

For a simple step-by-step guide, see our [Memory Issue Reporting Guide](MEMORY_ISSUE_GUIDE.md). 