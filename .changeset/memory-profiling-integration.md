---
"@empirica/core": patch
---

Add memory profiling tools to help debug server memory leaks.

Updated Tajriba dependency to add memory profiling capabilities that help identify and report memory leak issues. If you've experienced servers using more and more memory over time (especially after players leave), you can now easily capture debugging data to help us fix these issues.

New flags are available like `--tajriba.memprofile.enabled=true` to automatically save memory snapshots, and `--tajriba.memprofile.http_enabled=true` for live profiling. These tools have minimal performance impact and are safe to use in production.

See the [Memory Issue Reporting Guide](MEMORY_ISSUE_GUIDE.md) for simple steps to get started. 