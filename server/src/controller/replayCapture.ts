import { Observable, Observer, Subject } from "rxjs";
import fs from "fs";
import { IndexedBuffer } from "../model/indexedBuffer";
import { CarDashMessage } from "../model/carDashMessage";

export function getCaptureStream(delay = 25): Observable<Buffer> {
  const MSG_SIZE = 311;
  const buffer = Buffer.alloc(MSG_SIZE);

  const msg$ = new Subject<Buffer>();

  function readFile() {
    fs.open("capture.bin", "r", function (err, fd) {
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
                readFile();
              }
            });

            return;
          } else if (nread < MSG_SIZE) {
            console.error("unexpected buffer size read", nread);
            msg$.error("unexpected message size");
          }

          msg$.next(Buffer.from(buffer));
          setTimeout(() => readMessage(), 25);
        });
      }
      readMessage();
    });
  }

  readFile();

  return msg$;
}
