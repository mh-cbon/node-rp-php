# node Reverse Proxy php

For The Fun ! Using node to reverse proxy php servers. Less than 200 lines of code !

# Install & test

```
git checkout https://github.com/mh-cbon/node-rp-php.git
node index &
ab -n 10000 -c 1000 http://localhost:3000/
This is ApacheBench, Version 2.3 <$Revision: 1706008 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking localhost (be patient)
Completed 1000 requests
Completed 2000 requests
Completed 3000 requests
Completed 4000 requests
Completed 5000 requests
Completed 6000 requests
Completed 7000 requests
Completed 8000 requests
Completed 9000 requests
Completed 10000 requests
Finished 10000 requests


Server Software:        
Server Hostname:        localhost
Server Port:            3000

Document Path:          /
Document Length:        13 bytes

Concurrency Level:      1000
Time taken for tests:   7.256 seconds
Complete requests:      10000
Failed requests:        0
Total transferred:      880000 bytes
HTML transferred:       130000 bytes
Requests per second:    1378.21 [#/sec] (mean)
Time per request:       725.581 [ms] (mean)
Time per request:       0.726 [ms] (mean, across all concurrent requests)
Transfer rate:          118.44 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0  129 552.9      0    3012
Processing:   207  493 108.6    540     784
Waiting:      201  486 109.0    534     778
Total:        207  621 568.6    546    3793

Percentage of the requests served within a certain time (ms)
  50%    546
  66%    559
  75%    566
  80%    577
  90%    636
  95%   1332
  98%   3472
  99%   3735
 100%   3793 (longest request)
```
