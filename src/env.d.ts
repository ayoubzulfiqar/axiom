declare module 'chai'
declare module 'workbox-core' {
  export class ExtendableEvent {}
  export interface Event {
    waitUntil(promise: Promise<void>): void
  }
}
declare module '@vite-pwa/assets-generator/api' {}
declare module '@vite-pwa/assets-generator/config' {}
