import { Component } from '@angular/core';
import { Observable, Subscription, retry, timer } from 'rxjs';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';
import { HeartbeatService } from './heartbeat.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})



export class AppComponent {
  title = 'TestWebSockets';
  webSocket$: WebSocketSubject<any> | undefined;
  subscription: Subscription = <Subscription>{};
  public log: string = "";
  private currentPath: string = "";

  constructor(
    private _heartBeatService: HeartbeatService,
  ) { 
    this._heartBeatService.serviceState.subscribe((state) => {
      if (state) {
        // this.log = this.log + `[this._heartBeatService.serviceState.subscribe][${this.currentPath}] HeartbeatService is down. Stoping and restarting Server\n`;
        // this.unsubscribeSocketSubscription();
        // this.createWebSocketSubject(this.currentPath);
      } else {
        // this.log = this.log + `[this._heartBeatService.serviceState.subscribe][${this.currentPath}] HeartbeatService is up\n`;
      }
    });
  }

  public createWebSocketSubject(path: string) {
    const webSocketAddress = "192.168.0.135";
    // const webSocketAddress="localhost";
    // const webSocketAddress="10.0.30.164";

    // if (path === this.currentPath) return;
    this.log = this.log + `\n[${path}] Connecting to WebSocket\n`;
    if (this.webSocket$ !== undefined && !this.webSocket$.closed) {
      // if (this.currentPath !== path && this.currentPath !== "") {
      this.log = this.log + `[${path}] connected already. Unsubscribing\n`;
      this.unsubscribeSocketSubscription();
    }
    this.currentPath = path;
    this.log = this.log + `[${this.currentPath}] Creating websocket subject\n`;
    this.webSocket$ = webSocket<any>({
      url: `ws://${webSocketAddress}:58000/${path}`,
      openObserver: {
        next: (e: Event) => {
          this.log = this.log + `[openObserver.next][${(e.target as WebSocket).url.split('/')[3]}] Type: ${e.type}. Target: ${e.target}\n`;
          this.log = this.log + `[openObserver.next][${(e.target as WebSocket).url.split('/')[3]}] Requesting Full State from Server\n`;
          this.sendMessage('Full');
          this.log = this.log + `[openObserver.next][${(e.target as WebSocket).url.split('/')[3]}] Starting HeartBeat\n`;
          this._heartBeatService.startHeartbeat(webSocketAddress);
          return;
        },
        error: (e: Event) => this.log = this.log + `[openObserver.error][${(e.target as WebSocket).url}]${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[openObserver.error][${this.currentPath}] Complete\n`,
      },
      closeObserver: {
        next: (e: CloseEvent) => this.log = this.log + `[closeObserver.next][${(e.target as WebSocket).url.split('/')[3]}] Code: ${e.code}. Type ${e.type}. Reason: [${e.reason}] WasClean: ${e.wasClean}\n`,
        error: (e) => this.log = this.log + `[closeObserver.error][${(e.target as WebSocket).url}] ${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[closeObserver.complete][${this.currentPath}]\n`,
      },
      closingObserver: {
        next: (e: void) => this.log = this.log + `[closingObserver.next][${this.currentPath}]${JSON.stringify(e)}\n`,
        error: (e) => this.log = this.log + `[closingObserver.error][${this.currentPath}]${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[closingObserver.complete][${this.currentPath}]\n`,
      },
    });
    this.subscribeWebSocketSubject();
  }

  public subscribeWebSocketSubject() {
    if (!this.webSocket$) return;
    this.log = this.log + `[${this.currentPath}] Subscribing to websocket\n`;
    this.subscription = this.webSocket$.pipe(
      retry({
        count: Infinity, delay: (_, retryCount) => {
          this.log = this.log + `[retry][${this.currentPath}] ${retryCount} Retrying\n`;
          return timer(1000);
        }, resetOnSuccess: true
      })
    ).subscribe({
      next: msg => this.log = this.log + `[subscription.next][${this.currentPath}] [${msg}]\n`, // Called whenever there is a message from the server.
      error: err => {
        this.log = this.log + `[subscription.error][${this.currentPath}] ${JSON.stringify(err)}\n`;
        this.log = this.log + `[subscription.error][${this.currentPath}] Resubscribing to ${this.currentPath}\n`; // Called when connection is closed (for whatever reason).
        this.createWebSocketSubject(this.currentPath);
        return;
      }, // Called if at any point WebSocket API signals some kind of error.
      complete: () => {
        this.log = this.log + `[subscription.complete][${this.currentPath}]\n`; // Called when connection is closed (for whatever reason).
        this.log = this.log + `[subscription.complete][${this.currentPath}] Resubscribing to ${this.currentPath}\n`; // Called when connection is closed (for whatever reason).
        this.createWebSocketSubject(this.currentPath);
        return;
      } // Called when connection is closed (for whatever reason).
    });
  }

  public sendMessage(message: string) {
    this.log = this.log + `[this.webSocket$.next(message)][${this.currentPath}] Sending Message: [${message}]\n`;
    this.webSocket$?.next(message);
  }


  public unsubscribeSocketSubscription() {
    this.log = this.log + `[this.subscription.unsubscribe()][${this.currentPath}] Unsubscribing from socket subscription\n`
    this.subscription.unsubscribe();
    this.log = this.log + `[this.webSocket.complete()][${this.currentPath}] Closing from websocket\n`
    if (this.webSocket$ === undefined) {
      this.log = this.log + `[this.webSocket.complete()][${this.currentPath}] WebSocket is undefined\n`
      return;
    }
    this.webSocket$.complete();
    this.webSocket$ = undefined;
  }


  public clearLog() {
    this.log = "";
  }


}