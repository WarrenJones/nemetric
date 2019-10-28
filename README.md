
**Nemetrics** 利用最新的 W3C Performance 提案 (比如 [PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/PerformanceObserver)), 用于测量第一个dom生成的时间(FP/FCP)、用户最早可操作时间（fid|tti）和组件的生命周期性能。向监控后台报告实际用户测量值。

首次绘制 (FP)
首次内容绘制 (FCP)
首次输入延迟 (FID)
主角元素(Hero element)
框架、组件生命周期监控
Navigation Timing

![](https://res.unclewarren.cn/first-paint-and-first-input-delay.png)
## 开始测量


### 首次绘制 (FP)

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

### Navigation Timing
![](https://res.unclewarren.cn/timestamp-diagram.svg)
```javascript
const nemetric = new Nemetric({
  navigation timing: true
});
Nemetric: NavigationTiming  
dnsLookupTime: 0
downloadTime: 0.69
fetchTime: 12.56
headerSize: 317
timeToFirstByte: 8.59
totalTime: 9.28
workerTime: 0
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

## 分析

### Performance Analytics

![Performance Analytics](https://res.unclewarren.cn/nemo_monitor.png)
```
### 通用分析平台支持

在`Nemetric`配置回调以支持任意平台

```javascript
const nemetric = new Nemetric({
  analyticsTracker: ({data,metricName, duration, browser}) => {
    navigator.sendBeacon(BI_URL,{data,metricName, duration,browser});
  })
});
```

## 自定义 & 工具集

### 默认选项

在构造函数中提供给Nemetric默认选项。

```javascript
const options = {
  // Metrics
  firstContentfulPaint: false,
  firstPaint: false,
  firstInputDelay: false,
  // Analytics
  analyticsTracker: undefined,
  // Logging
  logPrefix: 'Nemetric:',
  logging: true,
  maxMeasureTime: 15000,
  warning: false,
  debugging: false,
  //是否在端内(针对端内做其他动作)
  inApp:true,
  //采样率0-1
  sampleRate:1,
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

* [如何采集和分析网页用户的性能指标](https://unclewarren.cn/2019/08/19/如何采集和分析网页用户的性能指标/)
* [Assessing Loading Performance in Real Life with Navigation and Resource Timing](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics)
* [navigation-timing](https://w3c.github.io/navigation-timing/)
* [Idle Until Urgent](https://philipwalton.com/articles/idle-until-urgent/)
* [First Input Delay](https://developers.google.com/web/updates/2018/05/first-input-delay)
