
# Test Setup
To build empirica from source, create the test 

Run this to build the empirica code
```
docker build -t empirica-tmp -f ./build/Dockerfile --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') --build-arg BUILD_SHA=$(git rev-list -1 HEAD) --build-arg BUILD_NUM=$GITHUB_RUN_NUMBER --build-arg VERSION=v0.0.0 .

docker run --rm empirica-tmp tar -cC /out . | tar -xC $(pwd)/build/public
```


from the project root:
``` 
docker build -f test/Dockerfile --force-rm --platform linux/x86_64 -t empirica-test .```

then run:
```
docker run -p 3000:3000 empirica-test
```