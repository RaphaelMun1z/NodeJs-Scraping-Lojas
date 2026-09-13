export abstract class ColetorBase<T> {
	abstract coletar(): Promise<T[]>;
}
