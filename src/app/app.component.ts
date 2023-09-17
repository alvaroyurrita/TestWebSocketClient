import { Component } from '@angular/core';
import { Observable, Subscription, retry, timer } from 'rxjs';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})



export class AppComponent {
  title = 'TestWebsockets';
  ws$: WebSocketSubject<any> = <WebSocketSubject<any>>{};
  subscription: Subscription = <Subscription>{};
  private path:string = "";
  private i: number = 0;
  private subscriptions: Subscription[] = [];
  public log: string = "";

  private getTime(): string {
    return new Date().toLocaleTimeString([],{hour: '2-digit', minute:'2-digit', second:'2-digit', hour12: false});
  }

  public createWebeSocketSubject(path: string) {
    this.path = path;
    this.log = this.log + `[${this.getTime()}] Creating websocket subject with path: ${path}\n`;
    this.ws$ = webSocket<any>({
      // url: 'ws://localhost:58000/' + path,
      url: 'ws://192.168.0.135:58000/' + path,
      openObserver: {
        next: (e:Event) => this.log = this.log + `[${this.getTime()}] [openObserver.next][${(e.target as WebSocket).url.split('/')[3]}] Type: ${e.type}. Target: ${e.target}\n`,
        error: (e: Event) => this.log = this.log + `[${this.getTime()}] [openObserver.error][${this.path}] ${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[${this.getTime()}] [openObserver.complete][${this.path}]\n`,
      },
      closeObserver: {
        next: (e: CloseEvent) => this.log = this.log + `[${this.getTime()}] [closeObserver.next][${(e.target as WebSocket).url.split('/')[3]}] Code: ${e.code}. Type ${e.type}. Reason: [${e.reason}] WasClean: ${e.wasClean}\n`,
        error: (e) => this.log = this.log + `[${this.getTime()}] [closeObserver.error][${this.path}] ${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[${this.getTime()}] [closeObserver.complete][${this.path}]\n`,
      },
      closingObserver: {
        next: (e) => this.log = this.log + `[${this.getTime()}] [closingObserver.next]\n`,
        error: (e) => this.log = this.log + `[${this.getTime()}] [closingObserver.error][${this.path}] ${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[${this.getTime()}] [closingObserver.complete][${this.path}]\n`,
      },
    });
  }

  public subscribeWebSocketSubject() {
    this.log = this.log + `[${this.getTime()}] Subscribing to websocket\n`;
    this.subscriptions.push( this.subscription = this.ws$
    .pipe(
      retry({ count: Infinity, delay: (_,retryCount) =>{
        this.log = this.log + `[${this.getTime()}] [retry] ${retryCount} Retrying\n`;
        return timer(1000);
      }, resetOnSuccess: true }))
    .subscribe({
      next: msg => this.log = this.log + `[${this.getTime()}] [subcription.next][${this.path}] [${msg}]\n`, // Called whenever there is a message from the server.
      error: err => {
        console.log(err);
        return this.log = this.log + `[${this.getTime()}] [subcription.error][${this.path}] ${JSON.stringify(err)}\n`;
      }, // Called if at any point WebSocket API signals some kind of error.
      complete: () => this.log = this.log + `[${this.getTime()}] [subcription.complete][${this.path}]\n` // Called when connection is closed (for whatever reason).
    }));
    this.log = this.log + `[${this.getTime()}] There are ${this.subscriptions.length} subscriptions\n`
  }

  public sendMessage(message: string) {
    this.log = this.log + `[${this.getTime()}] [this.subject.next(message)] Sending Message: [${message}]\n`;
    this.ws$.next(message);
  }


  public unsubcribeSocketSubscription() {
    this.log = this.log + `[${this.getTime()}] [this.subscription.unsubscribe()] Unsubscribing from socket subscription\n`
    if (this.subscriptions.length ===0) return;
    this.subscriptions.pop()?.unsubscribe();
    this.log = this.log + `[${this.getTime()}] There are ${this.subscriptions.length} subscriptions\n`
  }

  public unsubcribeSocketSubject() {
    this.log = this.log + `[${this.getTime()}] [this.subject.unsubscribe()] Unsubscribing from socket subject\n`
    this.ws$.unsubscribe();
    this.subscriptions = [];
    this.log = this.log + `[${this.getTime()}] There are ${this.subscriptions.length} subscriptions\n`
  }

  public completeConnection() {
    this.log = this.log + `[${this.getTime()}] [this.subject.complete()] Completing Connection\n`
    this.ws$.complete(); // Closes the connection.
    this.subscriptions = [];
    this.log = this.log + `[${this.getTime()}] There are ${this.subscriptions.length} subscriptions\n`
  }

  public completeWithError() {
    this.log = this.log + `[${this.getTime()}] [this.subject.error(...)] Completing Connection with Error\n`
    this.ws$.error({ code: 4500, reason: 'Client Completing With Error!' }); // Informs the server that this client is disconnecting.
    this.subscriptions = [];
    this.log = this.log + `[${this.getTime()}] There are ${this.subscriptions.length} subscriptions\n`
  }

  public clearLog(){
    this.log = "";
  }


}
