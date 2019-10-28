export interface IMetricEntry {
    start: number;
    end: number;
}
export declare type IPerformanceObserverType = 'longtask' | 'measure' | 'navigation' | 'paint' | 'resource' | 'first-input';
export declare type IPerformanceEntryInitiatorType = 'css' | 'fetch' | 'img' | 'other' | 'script' | 'xmlhttprequest';
export declare interface IPerformanceEntry {
    decodedBodySize?: number;
    duration: number;
    entryType: IPerformanceObserverType;
    initiatorType?: IPerformanceEntryInitiatorType;
    name: string;
    startTime: number;
}
export interface IPerformancePaintTiming {
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
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
    static supported(): boolean;
    /**
     * For now only Chrome fully support the PerformanceObserver interface
     * and the entryType "paint".
     * Firefox 58: https://bugzilla.mozilla.org/show_bug.cgi?id=1403027
     */
    static supportedPerformanceObserver(): boolean;
    navigationTimingCached: INemetricNavigationTiming;
    private perfObserver;
    /**
     * Navigation Timing API provides performance metrics for HTML documents.
     * w3c.github.io/navigation-timing/
     * developers.google.com/web/fundamentals/performance/navigation-and-resource-timing
     */
    readonly navigationTiming: INemetricNavigationTiming;
    /**
     * When performance API available
     * returns a DOMHighResTimeStamp, measured in milliseconds, accurate to five
     * thousandths of a millisecond (5 microseconds).
     */
    now(): number;
    mark(metricName: string, type: string): void;
    measure(metricName: string, metric: IMetricEntry): number;
    /**
     * PerformanceObserver subscribes to performance events as they happen
     * and respond to them asynchronously.
     */
    performanceObserver(eventType: IPerformanceObserverType, cb: (entries: any[]) => void): IPerformanceObserver;
    /**
     * Get the duration of the timing metric or -1 if there a measurement has
     * not been made by the User Timing API
     */
    private getDurationByMetric;
    /**
     * Return the last PerformanceEntry objects for the given name.
     */
    private getMeasurementForGivenName;
    private performanceObserverCb;
}
