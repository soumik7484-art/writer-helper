import {
  Story,
  Chapter,
  Page,
  Character,
  InvestigationStatus,
  TimelineEvent,
  Memory,
  PlotHole,
  OutlineItem,
  CoWriterPayload,
  CoWriterResponse,
  VectorPipelineExplanation,
  InvestigationBoardState,
  InvestigationCard,
  InvestigationConnection
} from '../types';
import rawMockData from '../data/mockStore.json';

const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '';

// Clone mock data into local runtime store
const localStore: any = JSON.parse(JSON.stringify(rawMockData));

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = `Request failed: ${response.status} ${response.statusText}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.detail) message = parsed.detail;
        } catch {
          if (errorText) message = errorText;
        }
        throw new Error(message);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      console.warn(`[StoryWeave API Error] ${endpoint}:`, err.message || err);
      throw err;
    }
  }

  // Healthcheck
  async checkHealth(): Promise<{ status: string }> {
    try {
      return await this.request<{ status: string }>('/api/health');
    } catch {
      return { status: 'healthy (local)' };
    }
  }

  // Stories
  async getStories(): Promise<Story[]> {
    try {
      return await this.request<Story[]>('/api/stories');
    } catch {
      return Object.values(localStore.stories || {}) as Story[];
    }
  }

  async getStory(id: string): Promise<Story> {
    try {
      return await this.request<Story>(`/api/stories/${id}`);
    } catch {
      const story = (localStore.stories || {})[id];
      if (story) return story as Story;
      throw new Error(`Story ${id} not found`);
    }
  }

  async createStory(story: Partial<Story>): Promise<Story> {
    try {
      return await this.request<Story>('/api/stories', {
        method: 'POST',
        body: JSON.stringify(story),
      });
    } catch {
      const id = story.id || `story_${Math.random().toString(36).substring(2, 9)}`;
      const newStory: Story = {
        id,
        title: story.title || 'Untitled Case File',
        description: story.description || '',
        genre: story.genre || 'Mystery',
        subgenre: story.subgenre || '',
        theme: story.theme || '',
        mood: story.mood || 'Mysterious',
        setting: story.setting || '',
        time_period: story.time_period || '',
        character_count: story.character_count || 3,
        writing_style: story.writing_style || 'Atmospheric',
        chapter_count: story.chapter_count || 5,
        ending_type: story.ending_type || 'Twist',
        plot_outline: story.plot_outline || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...story
      } as Story;
      localStore.stories = localStore.stories || {};
      localStore.stories[id] = newStory;
      return newStory;
    }
  }

  async updateStory(id: string, updates: Partial<Story>): Promise<Story> {
    try {
      return await this.request<Story>(`/api/stories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      if (localStore.stories && localStore.stories[id]) {
        localStore.stories[id] = { ...localStore.stories[id], ...updates, updated_at: new Date().toISOString() };
        return localStore.stories[id];
      }
      return updates as Story;
    }
  }

  async deleteStory(id: string): Promise<{ success: boolean; deleted_id: string }> {
    try {
      return await this.request<{ success: boolean; deleted_id: string }>(`/api/stories/${id}`, {
        method: 'DELETE',
      });
    } catch {
      if (localStore.stories) delete localStore.stories[id];
      return { success: true, deleted_id: id };
    }
  }

  async uploadStoryCover(storyId: string, file: File): Promise<{ cover_url: string; story: Story }> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/api/stories/${storyId}/cover`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = `Upload failed: ${response.statusText}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.detail) message = parsed.detail;
        } catch { }
        throw new Error(message);
      }

      return (await response.json()) as { cover_url: string; story: Story };
    } catch (err: any) {
      console.warn(`[StoryWeave Cover Upload Fallback]`, err.message);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (localStore.stories && localStore.stories[storyId]) {
        localStore.stories[storyId].cover_url = base64;
        localStore.stories[storyId].updated_at = new Date().toISOString();
        return { cover_url: base64, story: localStore.stories[storyId] };
      }
      return { cover_url: base64, story: { id: storyId, cover_url: base64 } as any };
    }
  }

  async uploadStandaloneCover(file: File): Promise<{ cover_url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/api/stories/upload-cover`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = `Upload failed: ${response.statusText}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.detail) message = parsed.detail;
        } catch { }
        throw new Error(message);
      }

      return (await response.json()) as { cover_url: string; filename: string };
    } catch (err: any) {
      console.warn(`[StoryWeave Standalone Upload Fallback]`, err.message);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return { cover_url: base64, filename: file.name };
    }
  }

  async removeStoryCover(storyId: string): Promise<{ cover_url: string; story: Story }> {
    try {
      return await this.request<{ cover_url: string; story: Story }>(`/api/stories/${storyId}/cover`, {
        method: 'DELETE',
      });
    } catch {
      if (localStore.stories && localStore.stories[storyId]) {
        localStore.stories[storyId].cover_url = '';
        localStore.stories[storyId].updated_at = new Date().toISOString();
        return { cover_url: '', story: localStore.stories[storyId] };
      }
      return { cover_url: '', story: { id: storyId, cover_url: '' } as any };
    }
  }

  async previewOutline(params: {
    title: string;
    description: string;
    genre: string;
    mood: string;
    chapter_count: number;
  }): Promise<{ outline: OutlineItem[] }> {
    try {
      return await this.request<{ outline: OutlineItem[] }>('/api/stories/outline/preview', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    } catch {
      const outline: OutlineItem[] = [];
      for (let i = 1; i <= (params.chapter_count || 5); i++) {
        outline.push({
          chapter: i,
          title: `Chapter ${i}: The ${params.mood || 'Unseen'} Inciting Incident`,
          focus: `Investigating the core conflict of ${params.title || 'the case'} within the ${params.genre} realm.`
        });
      }
      return { outline };
    }
  }

  // Chapters
  async getStoryChapters(storyId: string): Promise<Chapter[]> {
    try {
      return await this.request<Chapter[]>(`/api/stories/${storyId}/chapters`);
    } catch {
      const list = Object.values(localStore.chapters || {}) as Chapter[];
      return list.filter(c => c.story_id === storyId);
    }
  }

  async getChapter(chapterId: string): Promise<Chapter> {
    try {
      return await this.request<Chapter>(`/api/chapters/${chapterId}`);
    } catch {
      return (localStore.chapters || {})[chapterId] as Chapter;
    }
  }

  async createChapter(storyId: string, chapter: Partial<Chapter>): Promise<Chapter> {
    try {
      return await this.request<Chapter>(`/api/stories/${storyId}/chapters`, {
        method: 'POST',
        body: JSON.stringify(chapter),
      });
    } catch {
      const id = chapter.id || `chap_${Math.random().toString(36).substring(2, 9)}`;
      const newChap = {
        id,
        story_id: storyId,
        chapter_number: chapter.chapter_number || 1,
        title: chapter.title || 'New Chapter',
        content: chapter.content || '',
        status: chapter.status || 'draft',
        created_at: new Date().toISOString(),
        ...chapter
      } as Chapter;
      localStore.chapters = localStore.chapters || {};
      localStore.chapters[id] = newChap;
      return newChap;
    }
  }

  async updateChapter(chapterId: string, updates: Partial<Chapter>): Promise<Chapter> {
    try {
      return await this.request<Chapter>(`/api/chapters/${chapterId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      if (localStore.chapters && localStore.chapters[chapterId]) {
        localStore.chapters[chapterId] = { ...localStore.chapters[chapterId], ...updates };
        return localStore.chapters[chapterId];
      }
      return updates as Chapter;
    }
  }

  async deleteChapter(chapterId: string): Promise<{ success: boolean; deleted_id: string }> {
    try {
      return await this.request<{ success: boolean; deleted_id: string }>(`/api/chapters/${chapterId}`, {
        method: 'DELETE',
      });
    } catch {
      if (localStore.chapters) delete localStore.chapters[chapterId];
      return { success: true, deleted_id: chapterId };
    }
  }

  // Pages
  async getChapterPages(chapterId: string): Promise<Page[]> {
    try {
      return await this.request<Page[]>(`/api/chapters/${chapterId}/pages`);
    } catch {
      localStore.pages = localStore.pages || {};
      const list = Object.values(localStore.pages) as Page[];
      const chapterPages = list.filter(p => p.chapter_id === chapterId);
      if (chapterPages.length > 0) {
        return chapterPages.sort((a, b) => a.page_number - b.page_number);
      }
      // Initialize from chapter content if available
      const chap = (localStore.chapters || {})[chapterId];
      if (chap) {
        const raw = chap.content || '';
        const parts = raw.split(/<!--\s*(?:story-)?page-?break\s*-->/gi).filter((p: string) => p.trim());
        const initialParts = parts.length > 0 ? parts : [raw || '<p><br></p>'];
        const initialized: Page[] = initialParts.map((content: string, idx: number) => {
          const words = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
          const pageObj: Page = {
            id: `page_${chapterId}_${idx + 1}`,
            chapter_id: chapterId,
            page_number: idx + 1,
            content,
            word_count: words,
            save_status: 'saved',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          localStore.pages[pageObj.id] = pageObj;
          return pageObj;
        });
        return initialized;
      }
      return [];
    }
  }

  async getChapterPage(chapterId: string, pageId: string): Promise<Page> {
    try {
      return await this.request<Page>(`/api/chapters/${chapterId}/pages/${pageId}`);
    } catch {
      localStore.pages = localStore.pages || {};
      return localStore.pages[pageId] as Page;
    }
  }

  async createChapterPage(chapterId: string, page: Partial<Page>): Promise<Page> {
    try {
      return await this.request<Page>(`/api/chapters/${chapterId}/pages`, {
        method: 'POST',
        body: JSON.stringify(page),
      });
    } catch {
      localStore.pages = localStore.pages || {};
      const id = page.id || `page_${chapterId}_${Math.random().toString(36).substring(2, 9)}`;
      const existing = Object.values(localStore.pages).filter((p: any) => p.chapter_id === chapterId) as Page[];
      const page_number = page.page_number || (existing.length + 1);
      const content = page.content || '<p><br></p>';
      const words = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      const newPage: Page = {
        id,
        chapter_id: chapterId,
        page_number,
        content,
        word_count: words,
        save_status: 'saved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...page
      };
      localStore.pages[id] = newPage;
      return newPage;
    }
  }

  async updateChapterPage(chapterId: string, pageId: string, updates: Partial<Page>): Promise<Page> {
    try {
      return await this.request<Page>(`/api/chapters/${chapterId}/pages/${pageId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      localStore.pages = localStore.pages || {};
      if (localStore.pages[pageId]) {
        const content = updates.content !== undefined ? updates.content : localStore.pages[pageId].content;
        const words = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
        localStore.pages[pageId] = {
          ...localStore.pages[pageId],
          ...updates,
          content,
          word_count: words,
          updated_at: new Date().toISOString()
        };
        // Also update parent chapter content
        if (localStore.chapters && localStore.chapters[chapterId]) {
          const chapPages = (Object.values(localStore.pages) as Page[])
            .filter(p => p.chapter_id === chapterId)
            .sort((a, b) => a.page_number - b.page_number);
          const combined = chapPages.map(p => p.content).filter(c => c && c.trim() !== '<p><br></p>').join('<!-- story-page-break -->');
          localStore.chapters[chapterId].content = combined || chapPages[0]?.content || '';
          localStore.chapters[chapterId].word_count = chapPages.reduce((acc, p) => acc + p.word_count, 0);
        }
        return localStore.pages[pageId];
      }
      return updates as Page;
    }
  }

  async deleteChapterPage(chapterId: string, pageId: string): Promise<{ success: boolean; deleted_id: string }> {
    try {
      return await this.request<{ success: boolean; deleted_id: string }>(`/api/chapters/${chapterId}/pages/${pageId}`, {
        method: 'DELETE',
      });
    } catch {
      if (localStore.pages && localStore.pages[pageId]) {
        delete localStore.pages[pageId];
      }
      return { success: true, deleted_id: pageId };
    }
  }

  // Characters
  async getStoryCharacters(storyId: string): Promise<Character[]> {
    try {
      return await this.request<Character[]>(`/api/stories/${storyId}/characters`);
    } catch {
      const list = Object.values(localStore.characters || {}) as Character[];
      return list.filter(c => c.story_id === storyId);
    }
  }

  async getCharacter(charId: string): Promise<Character> {
    if (!charId) {
      throw new Error('Character ID is required');
    }
    try {
      return await this.request<Character>(`/api/characters/${charId}`);
    } catch (networkErr: any) {
      const localChars = localStore.characters || {};
      const found = localChars[charId] || Object.values(localChars).find((c: any) => c && c.id === charId);
      if (found) {
        return found as Character;
      }
      throw new Error(networkErr?.message || `Character dossier not found for ID: ${charId}`);
    }
  }

  async createCharacter(storyId: string, character: Partial<Character>): Promise<Character> {
    try {
      return await this.request<Character>(`/api/stories/${storyId}/characters`, {
        method: 'POST',
        body: JSON.stringify({ ...character, story_id: storyId }),
      });
    } catch {
      const id = character.id || `char_${Math.random().toString(36).substring(2, 9)}`;
      const newChar = {
        id,
        story_id: storyId,
        name: character.name || 'Unknown Person of Interest',
        role: character.role || 'Witness',
        personality_traits: character.personality_traits || ['Cautious', 'Observant'],
        relationships: character.relationships || [],
        current_status: character.current_status || 'Alive',
        created_at: new Date().toISOString(),
        ...character
      } as Character;
      localStore.characters = localStore.characters || {};
      localStore.characters[id] = newChar;
      return newChar;
    }
  }

  async updateCharacter(charId: string, updates: Partial<Character>): Promise<Character> {
    try {
      return await this.request<Character>(`/api/characters/${charId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      if (localStore.characters && localStore.characters[charId]) {
        localStore.characters[charId] = { ...localStore.characters[charId], ...updates };
        return localStore.characters[charId];
      }
      return updates as Character;
    }
  }

  async updateCharacterInvestigationStatus(
    charId: string,
    investigationStatus: InvestigationStatus
  ): Promise<Character> {
    try {
      return await this.request<Character>(`/api/characters/${charId}/investigation-status`, {
        method: 'PUT',
        body: JSON.stringify({ investigation_status: investigationStatus }),
      });
    } catch {
      return await this.updateCharacter(charId, { investigation_status: investigationStatus });
    }
  }

  async deleteCharacter(charId: string): Promise<{ success: boolean; deleted_id: string }> {
    try {
      return await this.request<{ success: boolean; deleted_id: string }>(`/api/characters/${charId}`, {
        method: 'DELETE',
      });
    } catch {
      if (localStore.characters) delete localStore.characters[charId];
      return { success: true, deleted_id: charId };
    }
  }

  async generateAiCharacter(params: { genre: string; role: string; theme?: string }): Promise<{ character: Partial<Character> }> {
    try {
      return await this.request<{ character: Partial<Character> }>('/api/characters/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    } catch {
      return {
        character: {
          name: "Inspector Julian Vance",
          role: params.role || "Lead Investigator",
          age: "42",
          personality_traits: ["Methodical", "Obsessive", "Guarded", "Cynical"],
          motivations: "Uncovering the truth behind the secret guild's missing records.",
          fears: "Being implicated in the very conspiracy he investigates.",
          goals: "Expose the syndicate before the midnight train departs.",
          secrets: "Holds a forged dossier bearing the High Commissioner's seal.",
          physical_description: "Tall with a graying trench coat, keen observant amber eyes, and a scarred left cheek."
        }
      };
    }
  }

  // Culprit Persistence
  async getStoryCulprit(storyId: string): Promise<{ story_id: string; culprit_id: string | null }> {
    try {
      return await this.request<{ story_id: string; culprit_id: string | null }>(`/api/stories/${storyId}/culprit`);
    } catch {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem(`storyweave_culprits_${storyId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Support legacy array format (old multi-culprit) — take first
          if (Array.isArray(parsed) && parsed.length > 0) {
            return { story_id: storyId, culprit_id: parsed[0] };
          }
          if (typeof parsed === 'string') {
            return { story_id: storyId, culprit_id: parsed };
          }
          if (parsed && typeof parsed.culprit_id === 'string') {
            return { story_id: storyId, culprit_id: parsed.culprit_id };
          }
        }
      } catch { }
      return { story_id: storyId, culprit_id: null };
    }
  }

  async setStoryCulprit(storyId: string, culpritId: string | null): Promise<{ story_id: string; culprit_id: string | null }> {
    // Save to localStorage immediately for zero-lag
    try {
      if (culpritId) {
        localStorage.setItem(`storyweave_culprits_${storyId}`, JSON.stringify({ culprit_id: culpritId }));
      } else {
        localStorage.removeItem(`storyweave_culprits_${storyId}`);
      }
    } catch { }

    try {
      if (culpritId) {
        return await this.request<{ story_id: string; culprit_id: string | null }>(`/api/stories/${storyId}/culprit`, {
          method: 'PUT',
          body: JSON.stringify({ culprit_id: culpritId }),
        });
      } else {
        await this.request<{ success: boolean }>(`/api/stories/${storyId}/culprit`, {
          method: 'DELETE',
        });
        return { story_id: storyId, culprit_id: null };
      }
    } catch {
      return { story_id: storyId, culprit_id: culpritId };
    }
  }

  // Character Board Layout & Connections Persistence
  async getStoryBoard(storyId: string): Promise<{ story_id: string; positions: Record<string, { x: number; y: number }>; connections: any[]; updated_at?: string }> {
    try {
      return await this.request<{ story_id: string; positions: Record<string, { x: number; y: number }>; connections: any[]; updated_at?: string }>(`/api/stories/${storyId}/board`);
    } catch {
      const saved = localStorage.getItem(`storyweave_char_board_${storyId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            story_id: storyId,
            positions: (parsed && typeof parsed.positions === 'object' && !Array.isArray(parsed.positions)) ? parsed.positions : {},
            connections: (parsed && Array.isArray(parsed.connections)) ? parsed.connections : [],
            updated_at: parsed?.updatedAt
          };
        } catch { }
      }
      return { story_id: storyId, positions: {}, connections: [] };
    }
  }

  async saveStoryBoard(storyId: string, boardData: { positions: Record<string, { x: number; y: number }>; connections: any[] }): Promise<{ story_id: string; positions: Record<string, { x: number; y: number }>; connections: any[]; updated_at?: string }> {
    try {
      return await this.request<{ story_id: string; positions: Record<string, { x: number; y: number }>; connections: any[]; updated_at?: string }>(`/api/stories/${storyId}/board`, {
        method: 'PUT',
        body: JSON.stringify(boardData),
      });
    } catch {
      // Graceful local persistence fallback
      try {
        localStorage.setItem(`storyweave_char_board_${storyId}`, JSON.stringify({
          positions: boardData.positions,
          connections: boardData.connections,
          updatedAt: new Date().toISOString()
        }));
      } catch { }
      return { story_id: storyId, ...boardData, updated_at: new Date().toISOString() };
    }
  }

  // Timeline
  async getStoryTimeline(storyId: string): Promise<TimelineEvent[]> {
    try {
      return await this.request<TimelineEvent[]>(`/api/stories/${storyId}/timeline`);
    } catch {
      const list = Object.values(localStore.events || {}) as TimelineEvent[];
      return list.filter(e => e.story_id === storyId);
    }
  }

  async createTimelineEvent(storyId: string, event: Partial<TimelineEvent>): Promise<TimelineEvent> {
    try {
      return await this.request<TimelineEvent>(`/api/stories/${storyId}/timeline`, {
        method: 'POST',
        body: JSON.stringify({ ...event, story_id: storyId }),
      });
    } catch {
      const id = event.id || `evt_${Math.random().toString(36).substring(2, 9)}`;
      const newEvt: TimelineEvent = {
        id,
        story_id: storyId,
        event_number: event.event_number || 1,
        title: event.title || 'New Narrative Event',
        description: event.description || '',
        category: event.category || 'plot_turn',
        status: event.status || 'Current',
        chronological_position: event.chronological_position || 1,
        consequences: event.consequences || [],
        characters_involved: event.characters_involved || [],
        created_at: new Date().toISOString(),
        ...event
      };
      localStore.events = localStore.events || {};
      localStore.events[id] = newEvt;
      return newEvt;
    }
  }

  async updateTimelineEvent(eventId: string, updates: Partial<TimelineEvent>): Promise<TimelineEvent> {
    try {
      return await this.request<TimelineEvent>(`/api/timeline/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      if (localStore.events && localStore.events[eventId]) {
        localStore.events[eventId] = { ...localStore.events[eventId], ...updates };
        return localStore.events[eventId];
      }
      return updates as TimelineEvent;
    }
  }

  async deleteTimelineEvent(eventId: string): Promise<{ success: boolean; deleted_id: string }> {
    try {
      return await this.request<{ success: boolean; deleted_id: string }>(`/api/timeline/${eventId}`, {
        method: 'DELETE',
      });
    } catch {
      if (localStore.events) delete localStore.events[eventId];
      return { success: true, deleted_id: eventId };
    }
  }

  async extractEventsFromChapter(storyId: string, chapterId: string): Promise<{ extracted_count: number; events: TimelineEvent[] }> {
    try {
      return await this.request<{ extracted_count: number; events: TimelineEvent[] }>(`/api/stories/${storyId}/timeline/extract`, {
        method: 'POST',
        body: JSON.stringify({ chapter_id: chapterId }),
      });
    } catch {
      const sampleEvt: TimelineEvent = {
        id: `evt_ext_${Date.now()}`,
        story_id: storyId,
        event_number: 99,
        title: "Discovered Encrypted Journal",
        description: "A cryptic ledger found beneath the floorboards reveals code words used by the secret council.",
        category: "discovery",
        status: "Completed",
        chronological_position: 99,
        consequences: ["Reveals the meeting spot at the docks"],
        characters_involved: ["Julian Vance"]
      };
      return { extracted_count: 1, events: [sampleEvt] };
    }
  }

  // Universe Memory
  async getStoryMemories(storyId: string, category?: string): Promise<Memory[]> {
    try {
      const url = category ? `/api/stories/${storyId}/memories?category=${encodeURIComponent(category)}` : `/api/stories/${storyId}/memories`;
      return await this.request<Memory[]>(url);
    } catch {
      const list = Object.values(localStore.memories || {}) as Memory[];
      const filtered = list.filter(m => m.story_id === storyId);
      return category ? filtered.filter(m => m.category === category) : filtered;
    }
  }

  async createMemory(storyId: string, memory: Partial<Memory>): Promise<Memory> {
    try {
      return await this.request<Memory>(`/api/stories/${storyId}/memories`, {
        method: 'POST',
        body: JSON.stringify({ ...memory, story_id: storyId }),
      });
    } catch {
      const id = memory.id || `mem_${Math.random().toString(36).substring(2, 9)}`;
      const newMem: Memory = {
        id,
        story_id: storyId,
        title: memory.title || 'New Lore Memory',
        description: memory.description || '',
        category: memory.category || 'world_rules',
        source_chapter: memory.source_chapter || 'Chapter 1',
        importance: memory.importance || 'Medium',
        created_at: new Date().toISOString(),
        ...memory
      };
      localStore.memories = localStore.memories || {};
      localStore.memories[id] = newMem;
      return newMem;
    }
  }

  async updateMemory(memoryId: string, updates: Partial<Memory>): Promise<Memory> {
    try {
      return await this.request<Memory>(`/api/memories/${memoryId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      if (localStore.memories && localStore.memories[memoryId]) {
        localStore.memories[memoryId] = { ...localStore.memories[memoryId], ...updates };
        return localStore.memories[memoryId];
      }
      return updates as Memory;
    }
  }

  async deleteMemory(memoryId: string): Promise<{ success: boolean; deleted_id: string }> {
    try {
      return await this.request<{ success: boolean; deleted_id: string }>(`/api/memories/${memoryId}`, {
        method: 'DELETE',
      });
    } catch {
      if (localStore.memories) delete localStore.memories[memoryId];
      return { success: true, deleted_id: memoryId };
    }
  }

  async searchMemories(storyId: string, query: string, topK: number = 5): Promise<{ query: string; results: Memory[]; count: number }> {
    try {
      return await this.request<{ query: string; results: Memory[]; count: number }>(`/api/stories/${storyId}/memories/search`, {
        method: 'POST',
        body: JSON.stringify({ query, top_k: topK }),
      });
    } catch {
      const list = Object.values(localStore.memories || {}) as Memory[];
      const q = (query || '').toLowerCase();
      const results = list
        .filter(m => m.story_id === storyId && (m.title.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q))))
        .slice(0, topK);
      return { query, results, count: results.length };
    }
  }

  async getPipelineExplanation(): Promise<VectorPipelineExplanation> {
    try {
      return await this.request<VectorPipelineExplanation>('/api/memory/pipeline');
    } catch {
      return {
        steps: [
          { step: 1, name: "Text Chunking", detail: "Semantic paragraph boundary with 64-token overlap." },
          { step: 2, name: "Vector Embedding", detail: "HuggingFace all-MiniLM-L6-v2 384-dim dense representation." },
          { step: 3, name: "ChromaDB Storage", detail: "Indexed in HNSW graph with Cosine distance metric." },
          { step: 4, name: "Similarity Search", detail: "Cosine distance threshold matching relevant facts." },
          { step: 5, name: "Context Injection", detail: "Dynamic prompt grounding for narrative continuity." }
        ],
        active_engine: "ChromaDB / Cosine RAG Vector Pipeline"
      };
    }
  }

  // Plot Holes & Consistency
  async getStoryPlotHoles(storyId: string): Promise<PlotHole[]> {
    try {
      return await this.request<PlotHole[]>(`/api/stories/${storyId}/plotholes`);
    } catch {
      const list = Object.values(localStore.plotholes || {}) as PlotHole[];
      return list.filter(p => p.story_id === storyId);
    }
  }

  async createPlotHole(storyId: string, plothole: Partial<PlotHole>): Promise<PlotHole> {
    try {
      return await this.request<PlotHole>(`/api/stories/${storyId}/plotholes`, {
        method: 'POST',
        body: JSON.stringify({ ...plothole, story_id: storyId }),
      });
    } catch {
      const id = plothole.id || `hole_${Math.random().toString(36).substring(2, 9)}`;
      const newHole = {
        id,
        story_id: storyId,
        title: plothole.title || 'Narrative Discrepancy',
        description: plothole.description || '',
        severity: plothole.severity || 'Warning',
        category: plothole.category || 'timeline_contradiction',
        status: plothole.status || 'open',
        previous_conflicting_info: plothole.previous_conflicting_info || '',
        current_conflicting_info: plothole.current_conflicting_info || '',
        source_chapters: plothole.source_chapters || ['Chapter 1'],
        suggested_correction: plothole.suggested_correction || '',
        created_at: new Date().toISOString(),
        ...plothole
      } as PlotHole;
      localStore.plotholes = localStore.plotholes || {};
      localStore.plotholes[id] = newHole;
      return newHole;
    }
  }

  async updatePlotHole(issueId: string, updates: Partial<PlotHole>): Promise<PlotHole> {
    try {
      return await this.request<PlotHole>(`/api/plotholes/${issueId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      if (localStore.plotholes && localStore.plotholes[issueId]) {
        localStore.plotholes[issueId] = { ...localStore.plotholes[issueId], ...updates };
        return localStore.plotholes[issueId];
      }
      return updates as PlotHole;
    }
  }

  async deletePlotHole(issueId: string): Promise<{ success: boolean; deleted_id: string }> {
    try {
      return await this.request<{ success: boolean; deleted_id: string }>(`/api/plotholes/${issueId}`, {
        method: 'DELETE',
      });
    } catch {
      if (localStore.plotholes) delete localStore.plotholes[issueId];
      return { success: true, deleted_id: issueId };
    }
  }

  async runConsistencyAudit(storyId: string): Promise<{ audit_results: PlotHole[]; total_detected: number }> {
    try {
      return await this.request<{ audit_results: PlotHole[]; total_detected: number }>(`/api/stories/${storyId}/plotholes/audit`, {
        method: 'POST',
      });
    } catch {
      const list = Object.values(localStore.plotholes || {}) as PlotHole[];
      const audit_results = list.filter(p => p.story_id === storyId);
      return { audit_results, total_detected: audit_results.length };
    }
  }

  // =========================================================================
  // INVESTIGATION BOARD API METHODS
  // =========================================================================

  async getInvestigationBoard(storyId: string): Promise<InvestigationBoardState> {
    try {
      return await this.request<InvestigationBoardState>(`/api/stories/${storyId}/investigation-board`);
    } catch {
      // Local fallback with persistence in localStorage and rich mockStore
      const storeBoard = (localStore.investigation_boards && (localStore.investigation_boards as any)[storyId]) as InvestigationBoardState | undefined;
      const saved = localStorage.getItem(`storyweave_investigation_board_${storyId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.elements) && parsed.elements.length >= (storeBoard?.elements?.length || 20)) {
            return parsed;
          }
        } catch { }
      }
      if (storeBoard) {
        return storeBoard;
      }
      return this.generateFallbackInvestigationBoard(storyId);
    }
  }

  async saveInvestigationBoard(storyId: string, board: InvestigationBoardState): Promise<InvestigationBoardState> {
    const payload = { ...board, story_id: storyId, updated_at: new Date().toISOString() };
    try {
      localStorage.setItem(`storyweave_investigation_board_${storyId}`, JSON.stringify(payload));
    } catch { }

    try {
      return await this.request<InvestigationBoardState>(`/api/stories/${storyId}/investigation-board`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } catch {
      return payload;
    }
  }

  async generateInvestigationBoard(storyId: string): Promise<InvestigationBoardState> {
    try {
      const res = await this.request<InvestigationBoardState>(`/api/stories/${storyId}/investigation-board/generate`, {
        method: 'POST',
      });
      try {
        localStorage.setItem(`storyweave_investigation_board_${storyId}`, JSON.stringify(res));
      } catch { }
      return res;
    } catch {
      const fallback = this.generateFallbackInvestigationBoard(storyId);
      try {
        localStorage.setItem(`storyweave_investigation_board_${storyId}`, JSON.stringify(fallback));
      } catch { }
      return fallback;
    }
  }

  async runIncrementalAnalysis(storyId: string, chapterId?: string): Promise<{ board: InvestigationBoardState; new_items_added: number; status: string; message: string }> {
    try {
      return await this.request<{ board: InvestigationBoardState; new_items_added: number; status: string; message: string }>(`/api/stories/${storyId}/investigation-board/incremental`, {
        method: 'POST',
        body: JSON.stringify({ chapter_id: chapterId })
      });
    } catch {
      const board = await this.getInvestigationBoard(storyId);
      const newCard: InvestigationCard = {
        id: `card_inc_${Math.random().toString(36).substring(2, 9)}`,
        story_id: storyId,
        type: 'evidence',
        title: 'New Chapter Evidence Excerpt',
        subtitle: 'Incremental Inquiry',
        description: 'New narrative threads cross-referenced against established Universe Memory.',
        status: 'unverified',
        color: 'aged',
        position: { x: 450, y: 820 },
      };
      board.elements.push(newCard);
      await this.saveInvestigationBoard(storyId, board);
      return { board, new_items_added: 1, status: 'success', message: 'Incorporated new findings into board.' };
    }
  }

  private generateFallbackInvestigationBoard(storyId: string): InvestigationBoardState {
    const chars = Object.values(localStore.characters || {}).filter((c: any) => c.story_id === storyId) as Character[];
    const timeline = Object.values(localStore.events || {}).filter((e: any) => e.story_id === storyId) as TimelineEvent[];

    const elements: InvestigationCard[] = [
      {
        id: `card_dossier_${storyId}`,
        story_id: storyId,
        type: 'clue',
        title: 'CASE FILE: #47A',
        subtitle: 'ACTIVE INVESTIGATION',
        description: 'INQUIRY: THE OBSIDIAN KEY OF RAVENSCAR\nSTATUS: ACTIVE CONTINUITY INQUIRY',
        status: 'verified',
        is_pinned: true,
        color: 'aged',
        position: { x: 60, y: 60 }
      },
      {
        id: `card_surv_${storyId}`,
        story_id: storyId,
        type: 'clue',
        title: '24/7 SURVEILLANCE',
        subtitle: 'Harbor Slip 4',
        description: 'Night watch ordered. Track courier departures.',
        status: 'unverified',
        is_pinned: false,
        color: 'yellow',
        position: { x: 310, y: 70 }
      },
      {
        id: `card_loc_manor_${storyId}`,
        story_id: storyId,
        type: 'location',
        title: 'Blackwood Cliffside Manor',
        subtitle: 'Location • Chapter 1 & 2',
        description: 'Gothic estate on north bluffs. Broken second-floor window.',
        image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
        status: 'verified',
        color: 'aged',
        position: { x: 560, y: 60 }
      },
      {
        id: `card_loc_archive_${storyId}`,
        story_id: storyId,
        type: 'location',
        title: 'The Whispering Archives & Lighthouse',
        subtitle: 'Location • Chapter 3',
        description: 'Subterranean stone vault beneath the Ravenscar beacon.',
        image_url: 'https://images.unsplash.com/photo-1519074069444-1ba4ea16e6f5?q=80&w=800&auto=format&fit=crop',
        status: 'verified',
        color: 'aged',
        position: { x: 840, y: 70 }
      },
      {
        id: `card_loc_harbor_${storyId}`,
        story_id: storyId,
        type: 'location',
        title: 'Ravenscar Maritime Harbor (Slip 4)',
        subtitle: 'Location • Chapter 1',
        description: 'Damp pier where anonymous courier delivered the salt-soaked watch.',
        image_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=800&auto=format&fit=crop',
        status: 'verified',
        color: 'aged',
        position: { x: 580, y: 320 }
      }
    ];

    // Add characters
    chars.forEach((c, idx) => {
      elements.push({
        id: `card_char_${c.id}`,
        story_id: storyId,
        type: 'character',
        title: c.name,
        subtitle: `${c.role} • ${c.current_status}`,
        description: c.physical_description || c.backstory || 'Subject in inquiry.',
        image_url: c.portrait_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop',
        status: c.role.toLowerCase().includes('antagonist') ? 'suspect' : 'alive',
        is_culprit: c.name.includes('Alistair'),
        color: 'polaroid',
        position: { x: 80 + idx * 220, y: 560 + (idx % 2 * 20) },
        metadata: { character_id: c.id, role: c.role }
      });
    });

    // Add evidence
    elements.push(
      {
        id: `card_ev_watch_${storyId}`,
        story_id: storyId,
        type: 'evidence',
        title: 'Waterlogged Pocket Watch',
        subtitle: 'Evidence • Chapter 1',
        description: 'Stopped precisely at 11:40 PM. Roman numerals encircle a concealed brass astronomical compass.',
        image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop',
        status: 'verified',
        color: 'aged',
        position: { x: 80, y: 880 }
      },
      {
        id: `card_ev_ledger_${storyId}`,
        story_id: storyId,
        type: 'evidence',
        title: 'Forged Estate Ledger',
        subtitle: 'Evidence • Chapter 2',
        description: 'Records dating to 1892 reveal payments to Julian Calder signed under a forged Blackwood crest.',
        image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop',
        status: 'verified',
        color: 'aged',
        position: { x: 340, y: 890 }
      },
      {
        id: `card_ev_sigil_${storyId}`,
        story_id: storyId,
        type: 'evidence',
        title: 'The Obsidian Sigil Key',
        subtitle: 'Evidence • Chapter 3',
        description: 'Carved volcanic glass pulsing faintly when brought near salt water.',
        image_url: 'https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?q=80&w=800&auto=format&fit=crop',
        status: 'verified',
        color: 'aged',
        position: { x: 620, y: 880 }
      }
    );

    // Timeline elements
    timeline.slice(0, 3).forEach((ev, idx) => {
      elements.push({
        id: `card_time_${ev.id}`,
        story_id: storyId,
        type: 'event',
        title: ev.title,
        subtitle: `Timeline Chronology • Chapter ${ev.chapter_number || idx + 1}`,
        description: ev.description,
        status: 'verified',
        color: 'manila',
        position: { x: 1140, y: 80 + idx * 190 }
      });
    });

    // Sticky notes
    elements.push(
      {
        id: `card_sticky_meeting_${storyId}`,
        story_id: storyId,
        type: 'clue',
        title: 'MEETING POINT X',
        subtitle: 'Observation',
        description: 'Wharf lights doused at 02:00 AM. Who signaled the skiff from south breakwater?',
        color: 'yellow',
        status: 'unverified',
        position: { x: 350, y: 340 }
      },
      {
        id: `card_sticky_drop_${storyId}`,
        story_id: storyId,
        type: 'clue',
        title: 'DEAD DROP 5/12',
        subtitle: 'Observation',
        description: 'Iron locker under lighthouse pier. Check tide schedule before midnight attempt.',
        color: 'pink',
        status: 'unverified',
        position: { x: 930, y: 350 }
      }
    );

    const connections: InvestigationConnection[] = [
      {
        id: `conn_1_${storyId}`,
        source_id: `card_loc_manor_${storyId}`,
        target_id: `card_ev_watch_${storyId}`,
        label: 'Tide coordinates match estate',
        type: 'location'
      },
      {
        id: `conn_2_${storyId}`,
        source_id: `card_ev_ledger_${storyId}`,
        target_id: `card_loc_manor_${storyId}`,
        label: 'Recovered from conservatory desk',
        type: 'evidence'
      }
    ];

    if (chars.length > 0) {
      connections.push({
        id: `conn_char_ev_${storyId}`,
        source_id: `card_char_${chars[0].id}`,
        target_id: `card_ev_watch_${storyId}`,
        label: 'Possesses the missing object',
        type: 'evidence'
      });
    }

    return {
      story_id: storyId,
      elements,
      connections,
      culprit_id: chars.find(c => c.name.includes('Alistair')) ? `card_char_${chars.find(c => c.name.includes('Alistair'))!.id}` : null,
      zoom: 1.0,
      pan_offset: { x: 0, y: 0 },
      updated_at: new Date().toISOString()
    };
  }

  // AI Co-writer
  async askCoWriter(payload: CoWriterPayload): Promise<CoWriterResponse> {
    try {
      return await this.request<CoWriterResponse>('/api/ai/cowriter', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return {
        generated_text: `The amber lamp flickered as rain hammered the high gothic window. Detective Julian Vance turned the heavy brass key inside the desk lock. The mechanism clicked with an authoritative shudder, parting the aged rosewood drawer to reveal the wax-sealed dispatch from Ravenscar. Every instinct warned him not to break the seal, but in this room, hesitation was the only fatal mistake.`,
        engine: "Google Gemini 1.5 Flash (Local Studio Fallback)",
        injected_memories_count: 2
      };
    }
  }
}

export const api = new ApiService();
