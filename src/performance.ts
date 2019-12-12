export interface IMetricEntry {
  start: number;
  end: number;
}

export type IPerformanceObserverType =
  'largest-contentful-paint'
  | 'longtask'
  | 'measure'
  | 'navigation'
  | 'paint'
  | 'resource'
  | 'first-input'

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
  loadTime: number;
  renderTime: number;
}

export interface IPerformanceDataConsumption {
  beacon: number;
  css: number;
  fetch: number;
  img: number;
  other: number;
  script: number;
  total: number;
  xmlhttprequest: number;
}
export interface IPerformancePaintTiming {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

declare const PerformanceObserver: any;

declare interface IPerformanceObserverEntryList {
  getEntries: any;
  getEntriesByName: any;
  getEntriesByType: any;
}

type EffectiveConnectionType = '2g' | '3g' | '4g' | 'slow-2g';

//https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
export interface INemetricNetworkInformation {
  downlink?: number;
  downlinkMax?: number;
  effectiveType?: EffectiveConnectionType;
  onchange?: () => void;
  //https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/rtt
  rtt?: number;
  saveData?: boolean;
}

export interface IPerformanceObserver {
  observer: () => void;
  disconnect: () => void;
}

export interface INemetricNavigationTiming {
  fetchTime?: number;
  workerTime?: number;
  totalTime?: number;
  downloadTime?: number;
  timeToFirstByte?: number;
  headerSize?: number;
  dnsLookupTime?: number;
  pageLoadTime?: number;
}

export default class Performance {
  /**
   * True if the browser supports the Navigation Timing API,
   * User Timing API and the PerformanceObserver Interface.
   * In Safari, the User Timing API (performance.mark()) is not available,
   * so the DevTools timeline will not be annotated with marks.
   * Support: developer.mozilla.org/en-US/docs/Web/API/Performance/mark
   * Support: developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver
   * Support: developer.mozilla.org/en-US/docs/Web/API/Performance/getEntriesByType
   */
  static supported(): boolean {
    return (
      window.performance &&
      !!performance.getEntriesByType &&
      !!performance.now &&
      !!performance.mark
    );
  }

  /**
   * For now only Chrome fully support the PerformanceObserver interface
   * and the entryType "paint".
   * Firefox 58: https://bugzilla.mozilla.org/show_bug.cgi?id=1403027
   */
  static supportedPerformanceObserver(): boolean {
    return (window as any).chrome && 'PerformanceObserver' in window;
  }

  navigationTimingCached: INemetricNavigationTiming = {};
  private perfObserver: any;

  /**
   * Navigation Timing API provides performance metrics for HTML documents.
   * w3c.github.io/navigation-timing/
   * developers.google.com/web/fundamentals/performance/navigation-and-resource-timing
   */
  getNavigationTiming(afteronLoad = false): INemetricNavigationTiming {
    if (
      !Performance.supported()
    ) {
      return this.navigationTimingCached;
    }
    // There is an open issue to type correctly getEntriesByType
    // github.com/microsoft/TypeScript/issues/33866
    const navigation = performance.getEntriesByType('navigation')[0] as any;
    // In Safari version 11.2 Navigation Timing isn't supported yet
    if (!navigation) {
      return this.navigationTimingCached;
    }

    if (afteronLoad) {
      return {
        pageLoadTime: parseFloat(
          (navigation.loadEventEnd - navigation.startTime).toFixed(2),
        )
      }
    }
    // We cache the navigation time for future times
    this.navigationTimingCached = {
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
      headerSize: parseFloat((navigation.transferSize - navigation.encodedBodySize || 0).toFixed(2)),
      // Measuring DNS lookup time
      dnsLookupTime: parseFloat(
        (navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2),
      )
    };
    return this.navigationTimingCached;
  }

  /**
   * The NetworkInformation interface provides information about the connection a device is using to communicate with the network and provides a means for scripts to be notified if the connection type changes. 
   * The NetworkInformation interfaces cannot be instantiated. 
   * It is instead accessed through the connection property of the Navigator interface.
   */
  get networkInformation(): INemetricNetworkInformation {
    if ('connection' in window.navigator) {
      const dataConnection = (window.navigator as any).connection;
      if (typeof dataConnection !== 'object') {
        return {};
      }
      return {
        downlink: dataConnection.downlink,
        effectiveType: dataConnection.effectiveType,
        rtt: dataConnection.rtt,
        saveData: !!dataConnection.saveData,
      };
    }
    return {};
  }


  /**
   * When performance API available
   * returns a DOMHighResTimeStamp, measured in milliseconds, accurate to five
   * thousandths of a millisecond (5 microseconds).
   */
  now(): number {
    return window.performance.now();
  }

  mark(metricName: string, type: string): void {
    const mark = `mark_${metricName}_${type}`;
    (window.performance.mark as any)(mark);
  }



  measure(metricName: string, metric: IMetricEntry): number {
    const startMark = `mark_${metricName}_start`;
    const endMark = `mark_${metricName}_end`;
    (window.performance.measure as any)(metricName, startMark, endMark);
    return this.getDurationByMetric(metricName, metric);
  }

  /**
   * PerformanceObserver subscribes to performance events as they happen
   * and respond to them asynchronously.
   */
  performanceObserver(
    eventType: IPerformanceObserverType,
    cb: (entries: any[]) => void,
  ): IPerformanceObserver {
    this.perfObserver = new PerformanceObserver(
      this.performanceObserverCb.bind(this, cb),
    );
    // Retrieve buffered events and subscribe to newer events for Paint Timing
    this.perfObserver.observe({ type: eventType, buffered: true });
    return this.perfObserver;
  }

  /**
   * Get the duration of the timing metric or -1 if there a measurement has
   * not been made by the User Timing API
   */
  private getDurationByMetric(
    metricName: string,
    metric: IMetricEntry,
  ): number {
    const entry = this.getMeasurementForGivenName(metricName);
    if (entry && entry.entryType === 'measure') {
      return entry.duration;
    }
    return -1;
  }

  /**
   * Return the last PerformanceEntry objects for the given name.
   */
  private getMeasurementForGivenName(metricName: string): PerformanceEntry {
    const entries = (window.performance as any).getEntriesByName(metricName);
    return entries[entries.length - 1];
  }

  private performanceObserverCb(
    cb: (entries: PerformanceEntry[]) => void,
    entryList: IPerformanceObserverEntryList,
  ): void {
    const entries = entryList.getEntries();
    cb(entries);
  }
}