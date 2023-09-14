import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, catchError, concatMap, delay, filter, interval, of, race, switchMap, tap, } from 'rxjs';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class HeartbeatService {

  public serviceState: Subject<boolean> = new Subject<boolean>();
  public IsConnected = false;
  public WebSocketAddress = "192.168.0.135";
  private ws$: WebSocketSubject<any> = <WebSocketSubject<any>>{};
  private intervalTime$ = new BehaviorSubject<number>(500);
  private waitingForHeartbeatResponse = false;
  constructor() {
    console.log("HeartbeatService constructor");
    this.startHeartbeat(this.WebSocketAddress);
  }

  private startHeartbeat(url: string) {
    this.ws$ = webSocket<any>({
      url: `ws://${url}:58000/Heartbeat`,
    });

    //Heartbeat is an observable that will ping every {intervalTime}
    //concatMap will start a race observable of whoevers finishes first: a timeout of 3 seconds or a message from the server
    const heartbeat$ = this.intervalTime$.pipe(
      switchMap(val => interval(val)),
      tap(() => {
        if (this.waitingForHeartbeatResponse) {
          console.log("waiting for hearbeat result, skipping ping"); //prevents possible multiple subscriptions to ws$
          return;
        }
        this.waitingForHeartbeatResponse = true;
        console.log("ping");
        this.ws$.next('Ping');
      }),
      concatMap(() => {
        return race(
          of('timeout').pipe(delay(3000)),
          this.ws$.asObservable().pipe(
            tap({
              next: () => console.log("ws pong"),
              error: () => console.log("ws error"),
              complete: () => console.log("ws complete")
            }),
            filter(m => m === 'Pong'),
            catchError(() => of('error'))
          )
        );
      })
    );

    //This subscribes to heartbeat$ and handles its emited messages
    //If the server is up and it changed since last interval, we set the interval to 30 seconds, set IsConnected to true, and update the serviceState
    //If the server is down and it changed since last interval, we set the interval to 1 second, set IsConnected to false, and update the serviceState
    heartbeat$
      .subscribe({
        next: msg => {
          this.waitingForHeartbeatResponse = false;
          console.log("message received " + msg)
          if (msg === 'Pong') {
            console.log("Server is up")
            this.intervalTime$.next(30000);
            this.IsConnected = true;
            this.serviceState.next(this.IsConnected);
          } else {
            this.serverIsDown()
          }
        },
        error: err => {
          this.serverIsDown();
        },
        complete: () => {
          this.serverIsDown();
        },
      });
  }

  private serverIsDown() {
    console.log("Server is down");
    this.ws$.complete();
    this.intervalTime$.next(1000);
    this.IsConnected = false;
    this.serviceState.next(this.IsConnected);
  }
}
