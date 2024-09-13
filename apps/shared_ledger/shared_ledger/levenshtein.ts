export function levenshtein(a: string, b: string): i32 {
	let i: i32 = 0;
	let j: i32 = 0
	let m: i32 = a.length;
	let n: i32 = b.length;
	let t = new Array<i32>(n*2);
	let u = new Array<i32>(m*2);
	if (!m) { return n; }
	if (!n) { return m; }
	for (j = 0; j <= n; j++) { t[j] = j; }
	for (i = 1; i <= m; i++) {
	  for (u = [i], j = 1; j <= n; j++) {
		u[j] = a[i - 1] === b[j - 1] ? t[j - 1] : i32(Math.min(Math.min(t[j - 1], t[j]), u[j - 1])) + 1;
	  } t = u;
	} return u[n];
}  