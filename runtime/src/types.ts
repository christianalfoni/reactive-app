export interface IOptions {
  devtool?: string;
}

export interface IClass<T> {
  new (...args: any[]): T;
  mixins: string[];
}

export interface IContainerConfig {
  [key: string]: IClass<any>;
}
