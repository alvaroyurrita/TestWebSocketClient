import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, catchError, concatMap, delay, filter, interval, of, race, retry, switchMap, tap, timer } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class HeartbeatService {

  public serviceState: Subject<boolean> = new Subject<boolean>();
  public IsConnected = false;
  public WebSocketAddress = "192.168.0.135";
  private intervalTime$ = new BehaviorSubject<number>(1000);
  // const webSocketAddress="localhost";
  // const webSocketAddress="10.0.30.164";
  constructor() {
    console.log("HeartbeatService constructor");
    this.startHeartbeat(this.WebSocketAddress);
  }

  public startHeartbeat(url: string) {
    const ws$ = webSocket<any>({
      url: `ws://${url}:58000/Heartbeat`,
    });

    //Heartbeat is a observable that will ping every {intervalTime}
    //concatMap will start a race observable of whoevers finishes first: a timeout of 3 seconds or a message from the server
    const heartbeat$ = this.intervalTime$.pipe(
      switchMap(val => interval(val)),
      tap(() => {
        console.log("ping");
        ws$.next('Ping');
      }),
      concatMap(() => {
        return race(
          of('timeout3').pipe(delay(3000)),
          ws$.asObservable().pipe(
            tap(() => console.log("pong")),
            filter(m => m === 'Pong'),
            catchError(() => of('error'))
          )
        );
      })
    );

//We subscribe to heartbeat$ and handle its emited messages
//If the server is up and it changed since last interval, we set the interval to 30 seconds, set IsConnected to true, and update the serviceState
//If the server is down and it changed since last interval, we set the interval to 1 second, set IsConnected to false, and update the serviceState
    heartbeat$
      .subscribe(msg => {
        console.log("message received " + msg)
        if (msg === 'Pong') {
          console.log("Server is up")
          if (this.IsConnected == true) return;
          this.intervalTime$.next(30000);
          this.IsConnected = true;
          this.serviceState.next(this.IsConnected);
        } else {
          console.log("Server is down")
          if (this.IsConnected == false) return;
          this.intervalTime$.next(1000);
          this.IsConnected = false;
          this.serviceState.next(this.IsConnected);
          ws$.complete();
        }
      });
  }
}
