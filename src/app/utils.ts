
export class Utils {

    public static pad(n: number, radix: number, width: number, zeroChar: string = '0'): string {

        const num = n.toString(radix).toUpperCase();

        return num.length >= width ? num : new Array(width - num.length + 1).join(zeroChar) + num;

    }

}
