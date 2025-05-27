# 🔍 Memory Issue Reporting Guide for Empirica

If you're experiencing memory problems where Empirica uses more and more memory over time (especially after players leave experiments), we've added tools to help us debug this. Here's how to help us fix it:

> **🔧 Want more advanced profiling options?** For detailed configuration and analysis options, see our [Memory Profiling Guide](MEMORY_PROFILING.md).

## 🚀 Step 1: Start Empirica with Memory Tracking

Instead of starting Empirica normally, add these flags:

```bash
empirica serve --tajriba.memprofile.enabled=true --tajriba.memprofile.dir=~/.empirica/profiles --tajriba.memprofile.interval=5m --tajriba.log.level=debug
```

**What this does:** Empirica will automatically save memory snapshots every 5 minutes to `~/.empirica/profiles/`

## 📊 Step 2: When You Notice the Memory Problem

When you see memory usage climbing up:

1. **Stop new players** from joining the experiment
2. **Let it run for a while** - the longer the better! More snapshots = better debugging data
3. **Keep Empirica running** - don't restart it yet! The automatic snapshots (every 5 minutes) will capture the memory leak

The profile files are small (under 10MB total), so don't worry about creating lots of them.

## 📁 Step 3: Collect the Files

After the memory issue happens, grab these files:
- Everything in `~/.empirica/profiles/` (all the `.pprof` files)
- Your Empirica log files

## 📤 Step 4: Create a GitHub Issue

Create a GitHub issue at https://github.com/empiricaly/empirica/issues with:
- When the problem started
- How long you ran the experiment
- How many players you had
- When the last player left
- What experiment/treatment you were running
- Attach the profile files (zip them if there are many)

**Example issue:**
> **Title:** Memory leak after players disconnect - Public Goods Game
> 
> **Description:** I had the memory leak issue again. I ran a 'Public Goods Game' experiment with 8 players for 2 hours. All players left around 3pm, but memory kept growing until 6pm when I had to restart. I've attached the memory profiles and logs. Thanks!
> 
> **System:** macOS 14.0, 16GB RAM, Empirica v1.x.x

## 💡 Tips

- **Safe to run:** These flags won't hurt performance or cause problems
- **File size:** The profile files are small (usually under 10MB total)
- **Clean up:** You can delete files in `~/.empirica/profiles/` after sending them
- **Multiple snapshots:** If the problem happens multiple times, capture each time - more data helps us!
- **HTTP profiling:** You can also add `--tajriba.memprofile.http_enabled=true` to get live profiling at http://localhost:6060/debug/pprof/

## ❓ Quick Troubleshooting

**Q: The `~/.empirica/profiles/` folder is empty**
- Make sure you added `--tajriba.memprofile.enabled=true` when starting Empirica
- Check that the directory exists: `ls -la ~/.empirica/profiles/`
- Wait at least 5 minutes for the first automatic profile

**Q: Should I restart Empirica with these flags?**
- Yes! Start fresh with the memory tracking flags before running your next experiment

**Q: Can I use this in production?**
- Yes! The memory profiling has minimal overhead and is safe for production use

## 🔧 Alternative: Configuration File

You can also add these settings to your `.empirica/empirica.toml` file instead of using command-line flags:

```toml
[tajriba.memprofile]
enabled = true
dir = "~/.empirica/profiles"
interval = "5m"
http_enabled = true
http_port = 6060

[tajriba.log]
level = "debug"
```

Then just run: `empirica serve`

## 🌐 Live Profiling (Advanced)

If you want to monitor memory in real-time, add the HTTP profiling flag:

```bash
empirica serve --tajriba.memprofile.enabled=true --tajriba.memprofile.http_enabled=true
```

Then visit:
- **Memory usage:** http://localhost:6060/debug/pprof/heap
- **Active goroutines:** http://localhost:6060/debug/pprof/goroutine
- **All profiles:** http://localhost:6060/debug/pprof/

## 📞 Reporting Issues

When creating a GitHub issue for memory problems, include:
1. Memory profile files (`.pprof` files) - attach as zip
2. Log files
3. Experiment details (duration, player count, treatments)
4. Timeline of when memory started growing
5. System information (OS, RAM amount, Empirica version)

**GitHub:** https://github.com/empiricaly/empirica/issues

This helps us identify and fix memory leaks faster! 