/**
 * Nemo metrics!
 * 统计页面性能
 * 1.First Paint (FP),
 * 2.First Contentful Paint (FCP)
 * 3.First Input Delay (FID) same as TTI
 * 4.Hero Element
 * 5.Navigation Timing
 */
import { BrowserInfo, detect } from './detect-browser';
import { IdleQueue } from './idle-queue';
import Performance, {
  IMetricEntry,
  IPerformanceEntry,
  IPerformanceObserverType,
  INemetricNavigationTiming
} from './performance';

declare global {
  interface IAnalyticsTrackerOptions {
    data?: any;
    metricName: string;
    duration?: number;
    browser?: BrowserInfo | any;
  }
}

export interface INemetricConfig {
  // Metrics
  firstContentfulPaint: boolean;
  firstInputDelay: boolean;
  firstPaint: boolean;
  dataConsumption: boolean;
  navigationTiming: boolean;
  // Analytics
  analyticsTracker?: (options: IAnalyticsTrackerOptions) => void;
  // Logging
  logPrefix: string;
  logging: boolean;
  maxMeasureTime: number;
  maxDataConsumption: number;
  warning: boolean;
  // Debugging
  debugging: boolean;
  //is for in-app
  inApp: boolean;
  //sample rate 0~1
  sampleRate: number;
}

export interface INemetricOptions {
  // Metrics
  firstContentfulPaint?: boolean;
  firstInputDelay?: boolean;
  firstPaint?: boolean;
  dataConsumption?: boolean;
  navigationTiming?: boolean;
  // Analytics
  analyticsTracker?: (options: IAnalyticsTrackerOptions) => void;
  // Logging
  logPrefix?: string;
  logging?: boolean;
  maxMeasureTime?: number;
  maxDataConsumption?: number;
  warning?: boolean;
  // Debugging
  debugging?: boolean;
  //is for in-app
  inApp?: boolean;
  //0~1
  sampleRate?: number;
}

export interface ILogOptions {
  metricName: string;
  duration?: number;
  data?: any;
  suffix?: string;
}

export interface IMetricEntry {
  start: number;
  end: number;
}

export interface IMetricMap {
  [metricName: string]: IMetricEntry;
}

export interface IObservers {
  [metricName: string]: any;
}

export interface IPerfObservers {
  [metricName: string]: any;
}

export type IPerformanceObserverType =
  | 'longtask'
  | 'measure'
  | 'navigation'
  | 'paint'
  | 'resource'
  | 'first-input';

export type IPerformanceEntryInitiatorType =
  | 'css'
  | 'fetch'
  | 'img'
  | 'other'
  | 'script'
  | 'xmlhttprequest';

export declare interface IPerformanceEntry {
  decodedBodySize?: number;
  duration: number;
  entryType: IPerformanceObserverType;
  initiatorType?: IPerformanceEntryInitiatorType;
  name: string;
  startTime: number;
}

export interface ISendTimingOptions {
  metricName: string;
  data?: any;
  duration?: number;
}

export type INemetricMetrics =
  | 'firstContentfulPaint'
  | 'firstPaint'
  | 'firstInputDelay';


export default class Nemetric {
  config: INemetricConfig = {
    // Metrics
    firstContentfulPaint: false,
    firstPaint: false,
    firstInputDelay: false,
    dataConsumption: false,
    navigationTiming: false,
    // Logging
    logPrefix: 'Nemetric:',
    logging: true,
    maxMeasureTime: 15000,
    maxDataConsumption: 20000,
    warning: false,
    debugging: false,
    //默认是app端内应用
    inApp: true,
    sampleRate: 1
  };
  firstPaintDuration: number = 0;
  firstContentfulPaintDuration: number = 0;
  firstInputDelayDuration: number = 0;
  dataConsumption: number = 0;
  observeFirstPaint?: Promise<number>;
  observeFirstContentfulPaint?: Promise<number>;
  observeFirstInputDelay?: Promise<number>;
  observeDataConsumption?: Promise<number>;
  private browser: BrowserInfo | any;
  private dataConsumptionTimeout: any;
  private isHidden: boolean = false;
  private logMetricWarn = 'Please provide a metric name';
  private queue: any;
  private metrics: IMetricMap = {};
  private observers: IObservers = {};
  private perf: Performance;
  private perfObservers: IPerfObservers = {};

  constructor(options: INemetricOptions = {}) {
    // Extend default config with external options
    this.config = Object.assign({}, this.config, options) as INemetricConfig;
    this.perf = new Performance();

    // Exit from Nemetric when basic Web Performance APIs aren't supported
    if (!Performance.supported()) {
      return;
    }

    this.browser = detect();

    // Checks if use Performance or the EmulatedPerformance instance
    if (Performance.supportedPerformanceObserver()) {
      this.initPerformanceObserver();
    }

    // Init visibilitychange listener
    this.onVisibilityChange();
    // 
    /**
     * if it's built for in-App
     * or it's safari
     * also need to listen for beforeunload
     */
    if (this.config.inApp || typeof window.safari === 'object' && window.safari.pushNotification) {
      this.onBeforeUnload();
    }
    // Ensures the queue is run immediately whenever the page
    // is in a state where it might soon be unloaded.
    // https://philipwalton.com/articles/idle-until-urgent/
    this.queue = new IdleQueue({ ensureTasksRun: true });
    // Log Navigation Timing
    if (this.config.navigationTiming) {
      this.logNavigationTiming();
    }
  }

  get navigationTiming(): INemetricNavigationTiming {
    if (!this.config.navigationTiming) {
      return {};
    }
    return this.perf.navigationTiming;
  }

  /**
   * Start performance measurement
   */
  start(metricName: string): void {
    if (!this.checkMetricName(metricName) || !Performance.supported()) {
      return;
    }
    if (this.metrics[metricName]) {
      this.logWarn('Recording already started.');
      return;
    }
    this.metrics[metricName] = {
      end: 0,
      start: this.perf.now(),
    };
    // Creates a timestamp in the browser's performance entry buffer
    this.perf.mark(metricName, 'start');
    // Reset hidden value
    this.isHidden = false;
  }

  /**
   * End performance measurement
   */
  end(metricName: string): void | number {
    if (!this.checkMetricName(metricName) || !Performance.supported()) {
      return;
    }
    const metric = this.metrics[metricName];
    if (!metric) {
      this.logWarn('Recording already stopped.');
      return;
    }
    // End Performance Mark
    metric.end = this.perf.now();
    this.perf.mark(metricName, 'end');
    // Get duration and change it to a two decimal value
    const duration = this.perf.measure(metricName, metric);
    const duration2Decimal = parseFloat(duration.toFixed(2));
    delete this.metrics[metricName];
    this.pushTask(() => {
      // Log to console, delete metric and send to analytics tracker
      this.log({ metricName, duration: duration2Decimal });
      this.sendTiming({ metricName, duration: duration2Decimal });
    });
    return duration2Decimal;
  }

  /**
   * End performance measurement after first paint from the beging of it
   */
  endPaint(metricName: string): Promise<void | number> {
    return new Promise(resolve => {
      setTimeout(() => {
        const duration = this.end(metricName);
        resolve(duration);
      });
    });
  }

  /**
   * Coloring Text in Browser Console
   */
  log(options: ILogOptions): void {
    const { metricName, data, duration, suffix } = { suffix: 'ms', ...options };
    // Don't log when page is hidden or has disabled logging
    if (this.isHidden || !this.config.logging) {
      return;
    }
    if (!metricName) {
      this.logWarn(this.logMetricWarn);
      return;
    }
    const style = 'color: green;font-size:11px;';
    let text = `%c ${this.config.logPrefix} ${metricName} `;
    if (duration) {
      const durationMs = duration.toFixed(2);
      text += `${durationMs} ${suffix}`;
      window.console.log(text, style);
    } else if (data) {
      window.console.log(text, style, data);
    }
  }

  /**
   * Coloring Debugging Text in Browser Console
   */
  logDebug(methodName: string, debugValue: any = ''): void {
    if (!this.config.debugging) {
      return;
    }
    window.console.log(`Nemetric.js debugging ${methodName}:`, debugValue);
  }

  /**
   * Sends the User timing measure to Analytics System.
   */
  sendTiming(options: ISendTimingOptions): void {
    const { metricName, data, duration } = options;
    // Doesn't send timing when page is hidden
    if (this.isHidden) {
      return;
    }
    // Get Browser from userAgent
    const browser = this.browser;
    // Send metric to custom Analytics service,
    if (this.config.analyticsTracker) {
      //random track
      Math.random() < this.config.sampleRate && this.config.analyticsTracker({ data, metricName, duration, browser });
    }
  }

  private initPerformanceObserver(): void {
    // Init observe FCP  and creates the Promise to observe metric
    if (this.config.firstPaint || this.config.firstContentfulPaint) {
      this.observeFirstPaint = new Promise(resolve => {
        this.logDebug('observeFirstPaint');
        this.observers['firstPaint'] = resolve;
      });
      this.observeFirstContentfulPaint = new Promise(resolve => {
        this.logDebug('observeFirstContentfulPaint');
        this.observers['firstContentfulPaint'] = resolve;
        this.initFirstPaint();
      });
    }

    // FID needs to be initialized as soon as Nemetric is available,
    // which returns a Promise that can be observed.
    // DataConsumption resolves after FID is triggered
    this.observeFirstInputDelay = new Promise(resolve => {
      this.observers['firstInputDelay'] = resolve;
      this.initFirstInputDelay();
    });

    // Collects KB information related to resources on the page
    if (this.config.dataConsumption) {
      this.observeDataConsumption = new Promise(resolve => {
        this.observers['dataConsumption'] = resolve;
        this.initDataConsumption();
      });
    }
  }

  private checkMetricName(metricName: string): boolean {
    if (metricName) {
      return true;
    }
    this.logWarn(this.logMetricWarn);
    return false;
  }

  private didVisibilityChange = () => {
    if (document.hidden) {
      this.isHidden = document.hidden;
    }
  };

  /**
   * Logging Performance Paint Timing
   */
  private performanceObserverCb(options: {
    entries: IPerformanceEntry[];
    entryName?: string;
    metricLog: string;
    metricName: INemetricMetrics;
    valueLog: 'duration' | 'startTime';
  }): void {
    this.logDebug('performanceObserverCb', options);
    options.entries.forEach((performanceEntry: IPerformanceEntry) => {
      this.pushTask(() => {
        if (
          this.config[options.metricName] &&
          (!options.entryName ||
            (options.entryName && performanceEntry.name === options.entryName))
        ) {
          this.logMetric(
            performanceEntry[options.valueLog],
            options.metricLog,
            options.metricName,
          );
        }
      });
      if (
        this.perfObservers.firstContentfulPaint &&
        performanceEntry.name === 'first-contentful-paint'
      ) {
        this.perfObservers.firstContentfulPaint.disconnect();
      }
    });
    if (
      this.perfObservers.firstInputDelay &&
      options.metricName === 'firstInputDelay'
    ) {
      this.perfObservers.firstInputDelay.disconnect();
    }
  }

  private performanceObserverResourceCb(options: {
    entries: IPerformanceEntry[];
  }): void {
    this.logDebug('performanceObserverResourceCb', options);
    options.entries.forEach((performanceEntry: IPerformanceEntry) => {
      if (performanceEntry.decodedBodySize) {
        const decodedBodySize = parseFloat(
          (performanceEntry.decodedBodySize / 1000).toFixed(2),
        );
        this.dataConsumption += decodedBodySize;
      }
    });
  }

  private digestFirstPaintEntries(entries: IPerformanceEntry[]): void {
    this.performanceObserverCb({
      entries,
      entryName: 'first-paint',
      metricLog: 'First Paint',
      metricName: 'firstPaint',
      valueLog: 'startTime',
    });
    this.performanceObserverCb({
      entries,
      entryName: 'first-contentful-paint',
      metricLog: 'First Contentful Paint',
      metricName: 'firstContentfulPaint',
      valueLog: 'startTime',
    });
  }

  /**
   * First Paint is essentially the paint after which
   * the biggest above-the-fold layout change has happened.
   */
  private initFirstPaint(): void {
    this.logDebug('initFirstPaint');
    try {
      this.perfObservers.firstContentfulPaint = this.perf.performanceObserver(
        'paint',
        this.digestFirstPaintEntries.bind(this),
      );
    } catch (e) {
      this.logWarn('initFirstPaint failed');
    }
  }

  private digestFirstInputDelayEntries(entries: IPerformanceEntry[]): void {
    this.performanceObserverCb({
      entries,
      metricLog: 'First Input Delay',
      metricName: 'firstInputDelay',
      valueLog: 'duration',
    });
    this.disconnectDataConsumption();
  }

  private initFirstInputDelay(): void {
    try {
      this.perfObservers.firstInputDelay = this.perf.performanceObserver(
        'first-input',
        this.digestFirstInputDelayEntries.bind(this),
      );
    } catch (e) {
      this.logWarn('initFirstInputDelay failed');
    }
  }

  private digestDataConsumptionEntries(entries: IPerformanceEntry[]): void {
    this.performanceObserverResourceCb({
      entries,
    });
  }

  private disconnectDataConsumption(): void {
    clearTimeout(this.dataConsumptionTimeout);
    if (!this.perfObservers.dataConsumption || !this.dataConsumption) {
      return;
    }
    this.logMetric(
      this.dataConsumption,
      'Data Consumption',
      'dataConsumption',
      'Kb',
    );
    this.perfObservers.dataConsumption.disconnect();
  }

  private initDataConsumption(): void {
    try {
      this.perfObservers.dataConsumption = this.perf.performanceObserver(
        'resource',
        this.digestDataConsumptionEntries.bind(this),
      );
    } catch (e) {
      this.logWarn('initDataConsumption failed');
    }
    this.dataConsumptionTimeout = setTimeout(() => {
      this.disconnectDataConsumption();
    }, 15000);
  }

  /**
   * From visibilitychange listener it saves only when
   * the page gets hidden, because it's important to not
   * use the wrong "hidden" value when send timing or logging.
   */
  private onVisibilityChange() {
    if (typeof document.hidden !== 'undefined') {
      // Opera 12.10 and Firefox 18 and later support
      document.addEventListener('visibilitychange', this.didVisibilityChange);
    }
  }
  /**
   * The onbeforeunload property of the WindowEventHandlers mixin is the EventHandler for processing beforeunload events. 
   * These events fire when a window is about to unload its resources. At this point,
   * the document is still visible and the event is still cancelable.
   */
  private onBeforeUnload() {
    if (typeof document.hidden !== 'undefined') {
      // Opera 12.10 and Firefox 18 and later support
      document.addEventListener('beforeunload', this.didVisibilityChange);
    }
  }


  /**
   * Dispatches the metric duration into internal logs
   * and the external time tracking service.
   */
  private logMetric(
    duration: number,
    logText: string,
    metricName: string,
    suffix: string = 'ms',
  ): void {
    const duration2Decimal = parseFloat(duration.toFixed(2));
    // Stop Analytics and Logging for false negative metrics
    if (
      metricName !== 'dataConsumption' &&
      duration2Decimal > this.config.maxMeasureTime
    ) {
      return;
    } else if (
      metricName === 'dataConsumption' &&
      duration2Decimal > this.config.maxDataConsumption
    ) {
      return;
    }

    // Save metrics in Duration property
    if (metricName === 'firstPaint') {
      this.firstPaintDuration = duration2Decimal;
    }
    if (metricName === 'firstContentfulPaint') {
      this.firstContentfulPaintDuration = duration2Decimal;
    }
    if (metricName === 'firstInputDelay') {
      this.firstInputDelayDuration = duration2Decimal;
    }
    this.observers[metricName](duration2Decimal);

    // Logs the metric in the internal console.log
    this.log({ metricName: logText, duration: duration2Decimal, suffix });

    // Sends the metric to an external tracking service
    this.sendTiming({ metricName, duration: duration2Decimal });
  }

  /**
   * Ensures console.warn exist and logging is enable for
   * warning messages
   */
  private logWarn(message: string): void {
    if (!this.config.warning || !this.config.logging) {
      return;
    }
    window.console.warn(this.config.logPrefix, message);
  }

  private logNavigationTiming() {
    const metricName = 'NavigationTiming';
    // Logs the metric in the internal console.log
    this.log({ metricName, data: this.navigationTiming, suffix: '' });
    // Sends the metric to an external tracking service
    this.sendTiming({ metricName, data: this.navigationTiming });
  }

  private pushTask(cb: any): void {
    if (this.queue && this.queue.pushTask) {
      this.queue.pushTask(() => {
        cb();
      });
    } else {
      cb();
    }
  }
}
