export class RenderOnDemandScheduler {
  private readonly renderFn: () => void;
  private readonly animating: () => boolean;

  constructor(renderFn: () => void, animating: () => boolean) {
    this.renderFn = renderFn;
    this.animating = animating;
  }

  markDirty(): void { void this.renderFn; void this.animating; }
  start(): void {}
  stop(): void {}
}
