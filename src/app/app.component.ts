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
  subject: WebSocketSubject<any> = <WebSocketSubject<any>>{};
  subscription: Subscription = <Subscription>{};
  public log: string = "";

  public createWebeSocketSubject(path: string) {
    this.log = this.log + `Creating websocket subject with path: ${path}\n`;
    this.subject = webSocket<any>({
      // url: 'ws://localhost:58000/' + path,
      url: 'ws://192.168.0.135:58000/' + path,
      openObserver: {
        next: (e:Event) => this.log = this.log + `[openObserver] Next. Type: ${e.type}. Target: ${e.target}.\n`,
        error: (e: Event) => this.log = this.log + `[openObserver] Error. ${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[openObserver] Complete\n`,
      },
      closeObserver: {
        next: (e: CloseEvent) => this.log = this.log + `[closeObserver] Next. Code: ${e.code}. Type ${e.type}. Reason: [${e.reason}] WasClean: ${e.wasClean}\n`,
        error: (e) => this.log = this.log + `[closeObserver] Error ${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[closeObserver] Complete\n`,
      },
      closingObserver: {
        next: (e: void) => this.log = this.log + `[closingObserver] Next ${JSON.stringify(e)}\n`,
        error: (e) => this.log = this.log + `[closingObserver] Error ${JSON.stringify(e)}\n`,
        complete: () => this.log = this.log + `[closingObserver] Complete\n`,
      },
    });
  }

  public subscribeWebSocketSubject() {
    this.log = this.log + `Subscribing to websocket\n`;
    this.subscription = this.subject.pipe(
      retry({ count: Infinity, delay: (_,retryCount) =>{
        this.log = this.log + `[retry] ${retryCount} Retrying\n`;
        return timer(1000);
      }, resetOnSuccess: true })
    ).subscribe({
      next: msg => this.log = this.log + `[subcription] Next: [${msg}]\n`, // Called whenever there is a message from the server.
      error: err => this.log = this.log + `[subcription] Error ${JSON.stringify(err)}\n`, // Called if at any point WebSocket API signals some kind of error.
      complete: () => this.log = this.log + '[subcription] complete\n' // Called when connection is closed (for whatever reason).
    });
    timer
  }

  public sendMessage(message: string) {
    this.log = this.log + `[this.subject.next(message)] Sending Message: [${message}]\n`;
    this.subject.next(message);
  }


  public unsubcribeSocketSubscription() {
    this.log = this.log + `[this.subscription.unsubscribe()] Unsubscribing from socket subscription\n`
    this.subscription.unsubscribe();
  }

  public unsubcribeSocketSubject() {
    this.log = this.log + `[this.subject.unsubscribe()] Unsubscribing from socket subject\n`
    this.subject.unsubscribe();
  }

  public completeConnection() {
    this.log = this.log + `[this.subject.complete()] Completing Connection\n`
    this.subject.complete(); // Closes the connection.
  }

  public completeWithError() {
    this.log = this.log + `[this.subject.error(...)] Completing Connection with Error\n`
    this.subject.error({ code: 4500, reason: 'Client Completing With Error!' }); // Informs the server that this client is disconnecting.
  }

  public clearLog(){
    this.log = "";
  }


}
