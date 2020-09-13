import { Observable, Observer, Subject } from "rxjs";
import fs from "fs";

export function getCaptureStream(
  filePath: string,
  delay = 25,
  loops = 0
): Observable<Buffer> {
  const MSG_SIZE = 311;
  const buffer = Buffer.alloc(MSG_SIZE);

  const msg$ = new Subject<Buffer>();

  let loopNumber = 0;

  function readFile() {
    fs.open(filePath, "r", function (err, fd) {
      if (err) {
        msg$.error(err);
        return;
      }

      function readMessage() {
        fs.read(fd, buffer, 0, MSG_SIZE, null, function (err, nread) {
          if (err) {
            msg$.error(err);
            return;
          }

          if (nread === 0) {
            fs.close(fd, function (err) {
              if (err) {
                msg$.error(err);
                return;
              } else {
                if (loops == 0 || loopNumber < loops) {
                  ++loopNumber;
                  readFile();
                } else {
                  msg$.complete();
                }
              }
            });

            return;
          } else if (nread < MSG_SIZE) {
            console.error("unexpected buffer size read", nread);
            msg$.error("unexpected message size");
          }

          msg$.next(Buffer.from(buffer));
          setTimeout(() => readMessage(), delay);
        });
      }
      readMessage();
    });
  }

  readFile();

  return msg$;
}
