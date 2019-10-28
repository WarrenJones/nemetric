/**
 * Nemo metrics!
 * 统计页面性能
 * 1.First Paint (FP),
 * 2.First Contentful Paint (FCP)
 * 3.First Input Delay (FID) same as TTI
 * 4.Hero Element
 * 5.Navigation Timing
 */
import { BrowserInfo } from './detect-browser';
import { IMetricEntry, IPerformanceObserverType, INemetricNavigationTiming } from './performance';
declare global {
    interface IAnalyticsTrackerOptions {
        data?: any;
        metricName: string;
        duration?: number;
        browser?: BrowserInfo | any;
    }
}
export interface INemetricConfig {
    firstContentfulPaint: boolean;
    firstInputDelay: boolean;
    firstPaint: boolean;
    dataConsumption: boolean;
    navigationTiming: boolean;
    analyticsTracker?: (options: IAnalyticsTrackerOptions) => void;
    logPrefix: string;
    logging: boolean;
    maxMeasureTime: number;
    maxDataConsumption: number;
    warning: boolean;
    debugging: boolean;
    inApp: boolean;
    sampleRate: number;
}
export interface INemetricOptions {
    firstContentfulPaint?: boolean;
    firstInputDelay?: boolean;
    firstPaint?: boolean;
    dataConsumption?: boolean;
    navigationTiming?: boolean;
    analyticsTracker?: (options: IAnalyticsTrackerOptions) => void;
    logPrefix?: string;
    logging?: boolean;
    maxMeasureTime?: number;
    maxDataConsumption?: number;
    warning?: boolean;
    debugging?: boolean;
    inApp?: boolean;
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
export interface ISendTimingOptions {
    metricName: string;
    data?: any;
    duration?: number;
}
export declare type INemetricMetrics = 'firstContentfulPaint' | 'firstPaint' | 'firstInputDelay';
export default class Nemetric {
    config: INemetricConfig;
    firstPaintDuration: number;
    firstContentfulPaintDuration: number;
    firstInputDelayDuration: number;
    dataConsumption: number;
    observeFirstPaint?: Promise<number>;
    observeFirstContentfulPaint?: Promise<number>;
    observeFirstInputDelay?: Promise<number>;
    observeDataConsumption?: Promise<number>;
    private browser;
    private dataConsumptionTimeout;
    private isHidden;
    private logMetricWarn;
    private queue;
    private metrics;
    private observers;
    private perf;
    private perfObservers;
    constructor(options?: INemetricOptions);
    readonly navigationTiming: INemetricNavigationTiming;
    /**
     * Start performance measurement
     */
    start(metricName: string): void;
    /**
     * End performance measurement
     */
    end(metricName: string): void | number;
    /**
     * End performance measurement after first paint from the beging of it
     */
    endPaint(metricName: string): Promise<void | number>;
    /**
     * Coloring Text in Browser Console
     */
    log(options: ILogOptions): void;
    /**
     * Coloring Debugging Text in Browser Console
     */
    logDebug(methodName: string, debugValue?: any): void;
    /**
     * Sends the User timing measure to Analytics System.
     */
    sendTiming(options: ISendTimingOptions): void;
    private initPerformanceObserver;
    private checkMetricName;
    private didVisibilityChange;
    /**
     * Logging Performance Paint Timing
     */
    private performanceObserverCb;
    private performanceObserverResourceCb;
    private digestFirstPaintEntries;
    /**
     * First Paint is essentially the paint after which
     * the biggest above-the-fold layout change has happened.
     */
    private initFirstPaint;
    private digestFirstInputDelayEntries;
    private initFirstInputDelay;
    private digestDataConsumptionEntries;
    private disconnectDataConsumption;
    private initDataConsumption;
    /**
     * From visibilitychange listener it saves only when
     * the page gets hidden, because it's important to not
     * use the wrong "hidden" value when send timing or logging.
     */
    private onVisibilityChange;
    /**
     * The onbeforeunload property of the WindowEventHandlers mixin is the EventHandler for processing beforeunload events.
     * These events fire when a window is about to unload its resources. At this point,
     * the document is still visible and the event is still cancelable.
     */
    private onBeforeUnload;
    /**
     * Dispatches the metric duration into internal logs
     * and the external time tracking service.
     */
    private logMetric;
    /**
     * Ensures console.warn exist and logging is enable for
     * warning messages
     */
    private logWarn;
    private logNavigationTiming;
    private pushTask;
}
