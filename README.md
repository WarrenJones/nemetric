
<a href="http://www.perfumejs.com/">
  <img src="https://res.unclewarren.cn/nemo.png" align="left" width="200" />
</a>

# [Nemetrics v1.2.3]((https://github.com/WarrenJones/nemetric))
一个小型的web性能监控库，它采集性能指标，如导航时间、资源时间、第一个有内容的油漆(FP/FCP)、最大的有内容油漆(LCP)、第一次输入延迟(FID)返回到您喜爱的分析工具。



**Nemetrics** 利用最新的 W3C Performance 提案 (比如 [PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/PerformanceObserver)), 用于测量第一个dom生成的时间(FP/FCP)、LCP,用户最早可操作时间（fid|tti）和组件的生命周期性能。向监控后台报告实际用户测量值。

[首次绘制 (FP)](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics#%E8%B7%9F%E8%B8%AA_fpfcp)

[首次内容绘制 (FCP)](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics#%E8%B7%9F%E8%B8%AA_fpfcp)

[首次输入延迟 (FID)](https://developers.google.com/web/updates/2018/05/first-input-delay)

[最大的绘制元素(LCP)](https://web.dev/lcp/)

主角元素(Hero element)

框架、组件生命周期监控

[Navigation Timing](https://w3c.github.io/navigation-timing/)

[Resource Timing](https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API/Using_the_Resource_Timing_API)

[NetworkInformation](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation)

![](https://res.unclewarren.cn/first-paint-and-first-input-delay.png)

你可以收集这些指标，并在根据ip采集世界各地深入了解你的客户如何看待你的应用程序的web性能。使用您喜欢的分析工具来可视化国家之间的数据，

下图是某个应用 印度/fetchTime/ 的数据图

![](https://res.unclewarren.cn/WechatIMG99.png)


## 如何使用

npm (https://www.npmjs.com/package/nemetric):

    npm install nemetric --save-dev
    

```javascript
import Nemetric from 'nemetric';
```

UMD
```javascript
import Nemetric from 'node_modules/nemetric/dist/nemetric.umd.min.js';
```

### Navigation Timing

![](https://camo.githubusercontent.com/ef97037de2daed3f359061ce34ed0d3ca61e1dfc/68747470733a2f2f7265732e756e636c6577617272656e2e636e2f74696d657374616d702d6469616772616d2e737667)


<ul>
  <li><b>DNS lookup</b>: 当用户请求URL时，将查询域名系统(DNS)，以将域转换为IP地址。</li>
  <li><b>Header size</b>: HTTP 头部大小</li>
  <li><b>Fetch time</b>:缓存查找和响应时间</li>
  <li><b>Worker time</b>: Service worker 时间加上响应时间</li>
  <li><b>Total time</b>:网络请求的请求和响应时间</li>
  <li><b>Download time</b>: 响应时间</li>
  <li><b>Time to First Byte</b>:客户端发送HTTP GET请求以接收来自服务器的请求资源的第一个字节所花费的时间。
   它是最大的web页面加载时间组件，占整个web页面延迟的40%到60%。</li>
  <li><b>page Load Time</b>:页面加载所需的总时长</li>
</ul>

```javascript
// fetchStart marks when the browser starts to fetch a resource
      // responseEnd is when the last byte of the response arrives
      fetchTime: parseFloat((navigation.responseEnd - navigation.fetchStart).toFixed(2)),
      // Service worker time plus response time
      workerTime: parseFloat(
        (navigation.workerStart > 0 ? navigation.responseEnd - navigation.workerStart : 0).toFixed(2),
      ),
      // Request plus response time (network only)
      totalTime: parseFloat((navigation.responseEnd - navigation.requestStart).toFixed(2)),
      // Response time only (download)
      downloadTime: parseFloat((navigation.responseEnd - navigation.responseStart).toFixed(2)),
      // Time to First Byte (TTFB)
      timeToFirstByte: parseFloat(
        (navigation.responseStart - navigation.requestStart).toFixed(2),
      ),
      // HTTP header size
      headerSize: parseFloat((navigation.transferSize - navigation.encodedBodySize|| 0).toFixed(2)),
      // Measuring DNS lookup time
      dnsLookupTime: parseFloat(
        (navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2),
      ),
      //page load time
      pageLoadTime:parseFloat(
        (navigation.loadEventEnd - navigation.startTime).toFixed(2),
      )
```

```javascript
interface IAnalyticsTrackerOptions {
        data?: any;
        metricName: string;
        duration?: number;
        browser?: BrowserInfo | any;
}
const nemetric = new Nemetric({
  navigationTiming: true,
  analyticsTracker: (data: IAnalyticsTrackerOptions) => {
          //上报到后台 
          request.get('/metric/measure', data)
        }
});
// Nemetric: NavigationTiming {{'{'}} ... timeToFirstByte: 192.65 {{'}'}}

```

### Resource Timing
Resource Timing收集与文档相关的资源的性能指标。比如css、script、图像等等。
Nemetric帮助公开所有的PerformanceResourceTiming条目和分组数据。

```javascript
const nemetric = new Nemetric({
  resourceTiming: true,
  dataConsumption: true,
  analyticsTracker: (data: IAnalyticsTrackerOptions) => {
          //上报到后台 
          request.get('/metric/measure', data)
    }
});
// Nemetric: dataConsumption { "css": 185.95, "fetch": 0, "img": 377.93, ... , "script": 8344.95 }
```

### NetworkInformation
NetworkInformation 提供有关设备正在使用的连接与网络进行通信的信息，并提供了在连接类型更改时通知脚本的事件。NetworkInformation 接口不能被是实例化， 而是通过 Navigator 的 connection 属性进行访问。

```javascript
const nemetric = new Nemetric({
  networkInformation: true,
  analyticsTracker: (data: IAnalyticsTrackerOptions) => {
          //上报到后台 
          request.get('/metric/measure', data)
    }
});
// Nemetric: NetworkInformation  {downlink: 10, effectiveType: "4g", rtt: 100, saveData: false}
```

### 首次绘制 FP 
**FP** 标记浏览器渲染任何在视觉上不同于导航前屏幕内容之内容的时间点

```javascript
const nemetric = new Nemetric({
  firstPaint: true
});
// Nemetric: First Paint 1482.00 ms
```

### 首次内容绘制 (FCP)

**FCP** 标记的是浏览器渲染来自 DOM 第一位内容的时间点，该内容可能是文本、图像、SVG 甚至 `<canvas>` 元素。

```javascript
const nemetric = new Nemetric({
  firstContentfulPaint: true
});
// Nemetric: First Contentful Paint 2029.00 ms
```

### 首次输入延迟 (FID)

**FID** 测量用户首次与站点交互时（即，当他们单击链接，点击按钮或使用自定义的，由JavaScript驱动的控件）到浏览器实际能够回应这种互动的延时。
```javascript
const nemetric = new Nemetric({
  firstInputDelay: true
});
// Nemetric: First Input Delay 3.20 ms
```
### 最大内容绘制 (LCP)

**LCP** 标记的是浏览器渲染的最大的那个元素，可能是

1. <img>元素
2. <svg>里面的<image>元素
3. <video>元素
4. 一个有background-image:url样式的元素
5. 块级元素包括 text节点或者其他内联元素 的元素

```javascript
const nemetric = new Nemetric({
  largestContentfulPaint: true
});
// Nemetric: Largest Contentful Paint 2029.00 ms
```



### 在开发者工具中标记指标

**性能标记** ([自定义时间测量API](https://developer.mozilla.org/zh-CN/docs/Web/API/User_Timing_API)) 用于在浏览器的性能条目中创建自定义性能标记。

```javascript
nemetric.start('doStuff');
doStuff(300);
nemetric.end('doStuff');
// Nemetric: doStuff 0.14 ms
```

### 组件首次渲染

当浏览器将像素渲染到屏幕时，此指标会在创建**新组件**后立即标记该点。

```javascript
nemetric.start('togglePopover');
$(element).popover('toggle');
nemetric.endPaint('togglePopover');
// Nemetric: togglePopover 10.54 ms
```

### 自定义日志记录

保存一段时间并且按照想要的方式打印出来

```javascript
const nemetric = new Nemetric({
  logPrefix: 'warren.js:'
});
nemetric.start('doStuff');
doStuff(500);
const duration = this.nemetric.end('doStuff');
nemetric.log('Custom logging', duration);
//warren.js: Custom logging 0.14 ms
```

### React
结合React 框架，我们可以开始配置`Nemetric`来收集初始化性能指标（比如 FCP,FID）。

将`nemetric.start()` 和 `nemetric.endPaint()` API用于组件的生命周期，已测量绘制组件所需要的时间。


```javascript
import React from 'react';
import Nemetric from 'nemetric';

import request from 'request';

const nemetric = new Nemetric({
  firstContentfulPaint: true,
  firstInputDelay: true
});

export default class App extends React.Component {

  constructor() {
    // 开始测量要绘制的组件时间
    nemetric.start('AppAfterPaint');
  }

  loadData = async () => {
    await request.get('whatever1');
    await request.get('whatever2');
    if(err){
       nemetric.clear('AppAfterPaint');
    }
    // 结束测量部件绘制时间
    nemetric.endPaint('AppAfterPaint');
  }

  render() {
    const data = this.loadData();
    return (
      <div>
        <h2>Nemo App</h2>
        <div>{data}</div>
      </div>
    );
  }
}
```


## 自定义 & 工具集

### 默认选项

在构造函数中提供给Nemetric默认选项。

```javascript
const config: INemetricConfig = {
    // Metrics
    firstContentfulPaint: false,
    firstPaint: false,
    firstInputDelay: false,
    largestContentfulPaint: false,
    navigationTiming: false,
    networkInformation: false,
    dataConsumption: false,
    // Logging
    logPrefix: 'Nemetric:',
    logging: true,
    maxMeasureTime: 15000,
    warning: false,
    //默认是app端内应用
    inApp: true,
    sampleRate: 1
  };
```

#### 工具集

Nemetric 公开了一些方法和属性，这些方法和属性可能对扩展这个库的人有用。

```javascript
const nemetric = new Nemetric({
  firstContentfulPaint: true,
  firstInputDelay: true,
});

// Values
nemetric.firstPaintDuration;
nemetric.firstContentfulPaintDuration;
nemetric.firstInputDelayDuration;

// Aync Values
const durationFCP = await nemetric.observeFirstContentfulPaint;
const durationFID = await nemetric.observeFirstInputDelay;

// 将自定义用户时间标识发送到Google Analytics
nemetric.sendTiming(metricName, durationFCP);
```


## 文章


* [Nemetric 实现原理](https://unclewarren.cn/2019/11/05/%20Nemetric%20%E5%AE%9E%E7%8E%B0%E5%8E%9F%E7%90%86/)
* [如何采集和分析网页用户的性能指标](https://unclewarren.cn/2019/08/19/如何采集和分析网页用户的性能指标/)
* [Assessing Loading Performance in Real Life with Navigation and Resource Timing](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics)
* [navigation-timing](https://w3c.github.io/navigation-timing/)
* [Idle Until Urgent](https://philipwalton.com/articles/idle-until-urgent/)
* [First Input Delay](https://developers.google.com/web/updates/2018/05/first-input-delay)
* [Largest Contentful Paint](https://web.dev/lcp/)
