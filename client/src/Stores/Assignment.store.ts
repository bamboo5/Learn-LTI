/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { observable, action } from 'mobx';
import { ChildStore } from './Core';
import { AssignmentService } from '../Services/Assignment.service';
import { Assignment } from '../Models/Assignment.model';
import { ErrorPageContent } from '../Core/Components/ErrorPageContent';
import { toObservable } from '../Core/Utils/Mobx/toObservable';
import { ServiceError } from '../Core/Utils/Axios/ServiceError';

export class AssignmentStore extends ChildStore {
  @observable assignment: Assignment | null = null;
  @observable isChangingPublishState: boolean | null = null;
  @observable errorContent : ErrorPageContent | undefined = undefined;
  @observable pushlishStatusChangeError: ServiceError | null = null;
  @observable syncedDescription: string | undefined;
  @observable syncedDeadline: Date | undefined;
  @observable serviceCallInProgress: number = 0;
  @observable hasServiceError: ServiceError | null = null;

  initialize(): void {
    toObservable(() => this.assignment?.publishStatus)
      .subscribe(newPublishStatus => {
        if(this.assignment && newPublishStatus === 'Published' && this.syncedDeadline && this.syncedDescription){
          this.assignment =  { ...this.assignment, deadline: new Date(this.syncedDeadline), description: this.syncedDescription };
          this.hasServiceError=null;
        }
      })

    toObservable(() => this.serviceCallInProgress)
      .subscribe(serviceCallInProgress => {
        if(serviceCallInProgress===0 && this.assignment?.publishStatus==='Published' && this.syncedDeadline && this.syncedDescription && this.assignment){
          this.assignment =  { ...this.assignment, deadline: new Date(this.syncedDeadline), description: this.syncedDescription };
        }
      })
  }
  
  @action
  async initializeAssignment(assignmentId: string): Promise<void> {
    const assignment = await AssignmentService.getAssignment(assignmentId);
    if (assignment.error) {
      this.errorContent = ErrorPageContent.CreateFromServiceError(assignment.error);
      return;
    }
    const { deadline } = assignment;
    this.assignment = deadline ? { ...assignment, deadline: new Date(deadline) } : assignment;
    this.syncedDescription = assignment.description;
    this.syncedDeadline = assignment.deadline;
  }

  @action
  updateAssignmentDeadline(newDeadline: Date): void {
    if (this.assignment) {
      this.assignment.deadline = newDeadline;
      this.serviceCallInProgress++;
      AssignmentService.updateAssignment(this.assignment)
      .then(hasErrors => {
        if(hasErrors === null) {
          this.syncedDeadline=newDeadline;
        }else {
          this.hasServiceError = hasErrors;
        }
        this.serviceCallInProgress--;
      })
    }
  }

  @action
  updateAssignmentDescription(newDescription: string): void {
    if (this.assignment) {
      this.assignment.description = newDescription;
      this.serviceCallInProgress++;
      AssignmentService.updateAssignment(this.assignment)
      .then(hasErrors => {
        if(hasErrors === null) {
          this.syncedDescription=newDescription;
        }else {
          this.hasServiceError = hasErrors;
        }
        this.serviceCallInProgress--;
      })
    
    }
  }

  @action
  async changeAssignmentPublishStatus(newPublishStatus: boolean): Promise<void> {
    if (this.assignment) {
      this.isChangingPublishState = true;
      this.pushlishStatusChangeError = null;

      const hasError = await AssignmentService.changeAssignmentPublishStatus(
        this.assignment.id,
        newPublishStatus
      );
      if (hasError === null) {
        this.assignment.publishStatus = newPublishStatus ? 'Published' : 'NotPublished';
      } else {
        this.pushlishStatusChangeError = hasError;
      }
      this.isChangingPublishState = false;
    }
  }
}
