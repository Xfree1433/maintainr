/**
 * The JSON body of a request, or {} when there is none worth reading.
 *
 * Route handlers called `await req.json()` bare. A body that was not valid
 * JSON threw, and a body of `null` then failed on the first property read --
 * either way the caller got a 500 with no message (found 11-22 by posting
 * malformed bodies to every route). Returning {} hands the problem to each
 * route's own validation, which already answers a missing field with a 400.
 * Arrays and other valid JSON pass through unchanged.
 */
export async function readBody(req: Request): Promise<any> {
  try {
    const body = await req.json();
    return body ?? {};
  } catch {
    return {};
  }
}
