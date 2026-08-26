import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  initGoogleAuth,
  googleSignIn,
  logoutGoogle,
  getGoogleAccessToken,
} from '../services/googleAuth';
import {
  sendGmailEmail,
  createGmailDraft,
  listRecentGmailMessages,
  getGmailUserProfile,
  generateRdoEmailHtml,
  generateOccurrenceAlertEmailHtml,
  SendEmailParams,
  GmailMessageSummary,
  GmailUserProfile,
} from '../services/gmailService';
import { DailyLog, Occurrence } from '../types';

interface GmailContextType {
  isConnected: boolean;
  googleUser: FirebaseUser | null;
  gmailProfile: GmailUserProfile | null;
  isLoading: boolean;
  isSending: boolean;
  sentMessages: GmailMessageSummary[];
  connectGoogle: () => Promise<boolean>;
  disconnectGoogle: () => Promise<void>;
  refreshSentMessages: () => Promise<void>;
  sendEmailWithConfirmation: (params: SendEmailParams) => Promise<boolean>;
  sendRdoEmail: (log: DailyLog, recipientEmails?: string[], ccEmails?: string[]) => Promise<boolean>;
  sendOccurrenceAlertEmail: (occurrence: Occurrence, recipientEmails?: string[]) => Promise<boolean>;
  saveDraftEmail: (params: SendEmailParams) => Promise<boolean>;
  openSendModalWithRdo: (log: DailyLog) => void;
  openSendModalWithOccurrence: (occurrence: Occurrence) => void;
  openCustomSendModal: (params?: Partial<SendEmailParams>) => void;
  closeSendModal: () => void;
  modalState: {
    isOpen: boolean;
    type: 'RDO' | 'OCCURRENCE' | 'CUSTOM' | 'CENTER';
    data?: any;
    defaultParams?: Partial<SendEmailParams>;
  };
}

const GmailContext = createContext<GmailContextType | undefined>(undefined);

export const GmailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [gmailProfile, setGmailProfile] = useState<GmailUserProfile | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<GmailMessageSummary[]>([]);

  // Send Modal Global State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'RDO' | 'OCCURRENCE' | 'CUSTOM' | 'CENTER';
    data?: any;
    defaultParams?: Partial<SendEmailParams>;
  }>({
    isOpen: false,
    type: 'CUSTOM',
  });

  const refreshSentMessages = useCallback(async () => {
    try {
      const token = await getGoogleAccessToken();
      if (!token) return;
      const list = await listRecentGmailMessages(8, 'label:SENT');
      setSentMessages(list);
    } catch (err) {
      console.error('Erro ao buscar mensagens do Gmail:', err);
    }
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await getGmailUserProfile();
      setGmailProfile(profile);
      await refreshSentMessages();
    } catch (e) {
      console.error('Erro ao obter perfil do Gmail:', e);
    }
  }, [refreshSentMessages]);

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, _token) => {
        setGoogleUser(user);
        setIsConnected(true);
        setIsLoading(false);
        loadUserProfile();
      },
      () => {
        setGoogleUser(null);
        setGmailProfile(null);
        setIsConnected(false);
        setIsLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadUserProfile]);

  const connectGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setIsConnected(true);
        await loadUserProfile();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Falha ao conectar com o Google:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectGoogle = async () => {
    setIsLoading(true);
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGmailProfile(null);
      setIsConnected(false);
      setSentMessages([]);
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmailWithConfirmation = async (params: SendEmailParams): Promise<boolean> => {
    setIsSending(true);
    try {
      await sendGmailEmail(params);
      await refreshSentMessages();
      return true;
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  const sendRdoEmail = async (
    log: DailyLog,
    recipientEmails?: string[],
    ccEmails?: string[]
  ): Promise<boolean> => {
    const to = recipientEmails && recipientEmails.length > 0 ? recipientEmails : ['obras.tottal@gmail.com'];
    const dateFmt = log.date.split('-').reverse().join('/');
    const subject = `[Obra] ${log.worksiteName || 'Obra'} - ${dateFmt} (${log.teamName})`;
    const bodyHtml = generateRdoEmailHtml(log);

    return await sendEmailWithConfirmation({
      to,
      cc: ccEmails,
      subject,
      bodyHtml,
    });
  };

  const sendOccurrenceAlertEmail = async (
    occurrence: Occurrence,
    recipientEmails?: string[]
  ): Promise<boolean> => {
    const to = recipientEmails && recipientEmails.length > 0 ? recipientEmails : ['obras.tottal@gmail.com'];
    const dateFmt = occurrence.date.split('-').reverse().join('/');
    const subject = `🚨 [URGÊNCIA ${occurrence.urgency}] Alerta em Campo - ${occurrence.category} (${occurrence.teamName} - ${dateFmt})`;
    const bodyHtml = generateOccurrenceAlertEmailHtml(occurrence);

    return await sendEmailWithConfirmation({
      to,
      subject,
      bodyHtml,
    });
  };

  const saveDraftEmail = async (params: SendEmailParams): Promise<boolean> => {
    setIsSending(true);
    try {
      await createGmailDraft(params);
      return true;
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  // Modal helpers
  const openSendModalWithRdo = (log: DailyLog) => {
    const dateFmt = log.date.split('-').reverse().join('/');
    setModalState({
      isOpen: true,
      type: 'RDO',
      data: log,
      defaultParams: {
        to: 'obras.tottal@gmail.com',
        subject: `[Obra] ${log.worksiteName || 'Obra'} - ${dateFmt} (${log.teamName})`,
        bodyHtml: generateRdoEmailHtml(log),
      },
    });
  };

  const openSendModalWithOccurrence = (occurrence: Occurrence) => {
    const dateFmt = occurrence.date.split('-').reverse().join('/');
    setModalState({
      isOpen: true,
      type: 'OCCURRENCE',
      data: occurrence,
      defaultParams: {
        to: 'obras.tottal@gmail.com',
        subject: `🚨 [URGÊNCIA ${occurrence.urgency}] Ocorrência de Campo - ${occurrence.category} (${occurrence.teamName} - ${dateFmt})`,
        bodyHtml: generateOccurrenceAlertEmailHtml(occurrence),
      },
    });
  };

  const openCustomSendModal = (params?: Partial<SendEmailParams>) => {
    setModalState({
      isOpen: true,
      type: 'CUSTOM',
      defaultParams: params || {
        to: 'obras.tottal@gmail.com',
        subject: 'Comunicado de Campo - Obras Tottal',
        bodyHtml: '<p>Digite sua mensagem aqui...</p>',
      },
    });
  };

  const closeSendModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <GmailContext.Provider
      value={{
        isConnected,
        googleUser,
        gmailProfile,
        isLoading,
        isSending,
        sentMessages,
        connectGoogle,
        disconnectGoogle,
        refreshSentMessages,
        sendEmailWithConfirmation,
        sendRdoEmail,
        sendOccurrenceAlertEmail,
        saveDraftEmail,
        openSendModalWithRdo,
        openSendModalWithOccurrence,
        openCustomSendModal,
        closeSendModal,
        modalState,
      }}
    >
      {children}
    </GmailContext.Provider>
  );
};

export const useGmail = () => {
  const context = useContext(GmailContext);
  if (!context) {
    throw new Error('useGmail deve ser utilizado dentro de um GmailProvider');
  }
  return context;
};
