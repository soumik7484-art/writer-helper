import {
  Story,
  Chapter,
  Character,
  TimelineEvent,
  Memory,
  PlotHole,
  OutlineItem,
  CoWriterPayload,
  CoWriterResponse,
  VectorPipelineExplanation
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
    try {
      return await this.request<Character>(`/api/characters/${charId}`);
    } catch {
      return (localStore.characters || {})[charId] as Character;
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
