declare module 'epubjs' {
  interface Book {
    renderTo(element: HTMLElement, options?: any): Rendition
    destroy(): void
  }

  interface Rendition {
    display(target?: string | number): Promise<void>
    prev(): Promise<void>
    next(): Promise<void>
    on(event: string, callback: Function): void
    off(event: string, callback: Function): void
    destroy(): void
  }

  interface Location {
    start: {
      cfi: string
    }
    end: {
      cfi: string
    }
  }

  function ePub(url: string): Book

  export = ePub
} 