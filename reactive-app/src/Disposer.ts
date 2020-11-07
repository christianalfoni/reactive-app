import { observable } from "./";

export type Disposable = () => void;

export class Disposer {
  @observable
  private disposables: Disposable[] = [];
  disposable(disposable: Disposable) {
    this.disposables.push(disposable);
    return () => {
      this.disposables.splice(this.disposables.indexOf(disposable), 1);
      disposable();
    };
  }
  dispose() {
    this.disposables.forEach((disposable) => disposable());
  }
}
