import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, catchError, concatMap, delay, filter, interval, of, race, switchMap, takeUntil, tap, timeout, } from 'rxjs';
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
  wsObservable$: Observable<any> = <Observable<any>>{};
  heartbeatSubsription: Observable<any> = <Observable<any>>{};
  heartbeat$: Observable<any>= <Observable<any>>{};
  cancelHearbeat$: Subject<string>;
  constructor() {
    this.cancelHearbeat$ = new Subject();
    console.log("HeartbeatService constructor");
    this.startHeartbeat(this.WebSocketAddress);
    //Using the online and offline events listeners provides a faster response to network changes than waiting for the ping/pong reply
    window.addEventListener('online', () => {
      if (this.IsConnected) return;
      console.log("The Network is up. Starting Heartbeat")
      this.intervalTime$.next(500);
      this.startHeartbeat(this.WebSocketAddress);
    });
    window.addEventListener('offline', () => {
      console.log("The Network is down. Stopping Heartbeat")
      this.IsConnected = false;
      this.serviceState.next(this.IsConnected);
      this.cancelHearbeat$.next("");
    });
  }

  private startHeartbeat(url: string) {
    this.ws$ = webSocket<any>({
      url: `ws://${url}:58000/Heartbeat`,
    });

    //Heartbeat is an observable that will ping every {intervalTime}
    //concatMap will start a race observable of whoevers finishes first: a timeout of 3 seconds or a message from the server
    this.heartbeat$ = this.intervalTime$.pipe(
      takeUntil(this.cancelHearbeat$), //cancels the interval when the network goes down
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
          //if there is not a response from the server in 3 seconds, the timeout observer wins the race and it emits timeout error
          of('timeout').pipe(delay(3000)),
          //otherwise the repsonse from the server is emitted.
          this.wsObservable$
        );
      })
    );

    this.wsObservable$ = this.ws$.pipe(
      tap({
        next: () => console.log("ws pong"),
        error: () => {
          console.log("ws error");
          this.serverIsDown();
        },
        complete: () => {
          console.log("ws complete");
          this.serverIsDown();
        }
      }),
      //filters all responses that are not 'Pong'
      filter(m => m === 'Pong'),
      catchError(() => of('error')),
    )

    //This subscribes to heartbeat$ and handles its emited messages
    //If the server is up and it changed since last interval, we set the interval to 30 seconds, set IsConnected to true, and update the serviceState
    //If the server is down and it changed since last interval, we set the interval to 1 second, set IsConnected to false, and update the serviceState
    this.heartbeat$
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
            // if the websocket emits anything that is not 'Pong', it means the server is down
            this.serverIsDown()
          }
        },
        error: err => {
          console.log("Subscription error");
          this.serverIsDown();
        },
        complete: () => {
        console.log("Subscription Complete");
        this.serverIsDown();
        },
      });
  }

  private serverIsDown() {
    console.log("Server is down");
    //Ipads and Iphones close the websocket when they go to sleep or the app is inactive.
    //When they come back from sleep or the app is active again, the app needs to be properly unsubcribed for the websocket to work again.
    //This doesn't happen on Windows or Android,
    //The below line seems to force the unsubcription on the Ipad/Iphone.
    this.wsObservable$.subscribe().unsubscribe();

    this.ws$.complete();
    this.intervalTime$.next(1000);
    this.IsConnected = false;
    this.serviceState.next(this.IsConnected);
  }
}
